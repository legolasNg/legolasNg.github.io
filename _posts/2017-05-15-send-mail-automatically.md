---
layout:     post
title:      "懒人攻略 -- 自动发送邮件"
date:       2017-05-15 19:57:00 +0800
category:   "linux"
tags:       ["crond", "mailx"]
excerpt:    "计算机的乐趣在于什么？一千个人眼中可能有一千个哈姆雷特，在我看来计算机的最大乐趣是，能随心所欲地做自己想做的事情，能限制发挥的只是你的思维和技术。我是一个非常懒的人，不太乐意做重复的事情，并不是想节省点时间做有意义的事情，单纯不想动而已。最近一个朋友问我，该怎么把每日报表自动生成然后发送给同事，于是便产生了这篇文章，简单介绍下shell的魅力。"
---

计算机的乐趣在于什么？一千个人眼中可能有一千个哈姆雷特，在我看来计算机的最大乐趣是，能随心所欲地做自己想做的事情，能限制发挥的只是你的思维和技术。我是一个非常懒的人，不太乐意做重复的事情，并不是想节省点时间做有意义的事情，单纯不想动而已。最近一个朋友问我，该怎么把每日报表自动生成然后发送给同事，于是便产生了这篇文章，简单介绍下shell的魅力。

其实处理这个问题的思路很简单:

- 新建一个shell脚本
- 在shell脚本中加入生成报表的命令
- 将生成的报表简单处理格式，生成对应的文件
- 在shell脚本中加入发送邮件的命令，之前的报表文件作为附件
- 将shell脚本添加到crontab任务队列，设置对应的定时规则

## 1.新建脚本

新建一个shell脚本`auto_mail.sh`，并初始化shell和crond的环境:

```bash
#!/bin/bash
# 设置PATH环境
PATH=/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin
```

为什么要初始化？我在之前的文章 [《crond环境变量问题》](/2016/12/16/crond-env-problems/) 有详细说明。

## 2.生成数据

根据每个人的需求，这个步骤可以是生成报表、系统警报等之类的操作。我一般的操作是利用mysql去查询一些数据:

```bash
# 因为每天都有数据文件生成，最好加上日期来区分文件
savetime=`date '+%Y%m%d-%H%M%S'`

# -e后面接sql查询语句
# 可以事先将文件后缀命名为最终格式，因为后缀只是方便人识别，并不能修改文件格式
mysql -u[user] -p[password] -h[host] -D[database] -e "[statement]" > "result-${savetime}.csv"
```

## 3.格式处理

一般通过命令生成的数据，并不是太符合我们要求。比如编码格式转换、缩进或空格替换为逗号(csv分隔符是逗号)等:

```bash
# 将缩进替换为逗号
sed -i "s/\t/,/g" "result-${savetime}.csv"

# 将linux环境下的换行\n，替换为windows下的换行\r\n
sed -i "s/\r/\r\n/g" "result-${savetime}.csv"
```

_sed工具如果机器上没有，通过`yum install sed`安装。如果还有其他需求，还可以通过其他工具来处理。_

## 4.文件压缩

如果数据量过大，导致生成的数据文件过大，邮件发送可能会出现问题(附件大小限制)，我们可以通过压缩文件来解决：

```bash
tar zcvf "result-${savetime}.tar.gz" "result-${savetime}.csv"
```

## 5.发送邮件

`mailx`一个电子邮件发送和读取的简单程序。默认情况下，`mailx`将邮件发送到本地的MTA(Mail Transfer Agent)，比如`SendMail`、`Qmail`、`Postfix`等提供的服务。如果我们不搭建邮件服务器，想使用其他主机提供的邮件服务(比如163邮箱、QQ邮箱)，通过修改文件`/etc/nail.rc`即可配置指定邮件服务器。

### 安装

linux命令行下邮件程序推荐使用`mailx`，通过`yum install mailx`安装，使用可以通过`mailx`或者`mail`(maix的别名)命令。

### 配置邮件服务器

编辑`/etc/nail.rc`(旧版本是`/etc/mail.rc`):

```conf
set from=test@163.com smtp=smtp.163.com
set smtp-auth-user=your_E-mail_address smtp-auth-password=your_password
set smtp-auth=login
```

### 发送邮件

我们可以通过`mail`命令配合管道和重定向，在命令行发送邮件:

```bash
# 使用管道将邮件内容传递给mail命令，也可以将邮件内容写在文件中通过重定向传递给mail命令
# -r用来设置from地址，和nail.rc配置中的from作用一致
# -- -f发件人地址，-F发件人姓名
# -s设置邮件标题，-a添加邮件附件
# -b可以添加抄送地址，逗号分割
echo "[content]" | mail -r [from_address] -s [subject] -a [attach_file] [to_address]
```

## 6.添加定时任务

之前的文章 [《crond环境变量问题》](/2016/12/16/crond-env-problems/) 有详细说明crontab的使用，我们如果使用脚本添加定时任务，是不可能通过`crontab -e`来开启编辑器添加，所以我们可以通过管道来添加:

```bash
# 通过文件添加
echo "30 3 * * * sh /home/[user]/auto_mail.sh" >> crond_rule.txt
crontab crond_rule.txt

# 通过管道添加
echo "30 3 * * * sh /home/[user]/auto_mail.sh" | crontab
```

_建议在添加定时任务之前，手动运行下脚本，测试是否能成功发送邮件_

现在看来是不是十分简单，将"拒绝重复劳动"作为人生信条，你将获得一种新的生活方式。
