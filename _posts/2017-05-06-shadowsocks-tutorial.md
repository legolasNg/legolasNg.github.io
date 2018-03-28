---
layout:     post
title:      "大王叫我来巡山 -- Shadowsocks"
date:       2017-05-06 10:48:00 +0800
category:   "Shadowsocks"
tags:       ["Shadowsocks", "vps"]
excerpt:    "`Shadowsocks`是一种安全的sock5代理软件，需要先将服务端部署在服务器上，然后通过客户端连接并创建本地连接。原理：在成功连接到服务器后，客户端会在用户的电脑上构建一个本地Socks5代理。浏览网络时，网络流量会被分到本地socks5代理，客户端将其加密之后发送到服务器，服务器以同样的加密方式将流量回传给客户端，以此实现代理上网([来自wikipedia](https://zh.wikipedia.org/wiki/Shadowsocks))。"
---

之前用过免费的lantern、付费的greenvpn，也恬不知耻地找人要过Shadowsocks帐号。lantern速度太慢，而且流量有限制(虽然可以通过删除本地配置文件来绕过限制);greenvpn相对稳定点，但是费用有点贵;找人要SS帐号，总觉得不太放心，而且指不定哪天就没法用了。所以上个月，在搬瓦工买了台vps，搭了Shadowsocks给自己单独使用。

`Shadowsocks`是一种安全的sock5代理软件，需要先将服务端部署在服务器上，然后通过客户端连接并创建本地连接。原理：在成功连接到服务器后，客户端会在用户的电脑上构建一个本地Socks5代理。浏览网络时，网络流量会被分到本地socks5代理，客户端将其加密之后发送到服务器，服务器以同样的加密方式将流量回传给客户端，以此实现代理上网([来自wikipedia](https://zh.wikipedia.org/wiki/Shadowsocks))。

## 购买vps

如果我们自己搭建SS服务来实现代理上网(FQ)，就需要将SS服务端搭建在国外的服务器上，才能突破封锁。部署Shadowsocks，其实只需要购买比较便宜的vps就足够了，没必要购买类似AWS的EC2之类的弹性计算主机。国外有很多vps云主机服务商，一般提供较低配置的虚拟主机，可以根据自己需求购买对应的配置。我个人比较推荐[搬瓦工](https://bwh1.net/)，可选择机房多，服务稳定，价格实惠。

我选择了一个最便宜的套餐，10G SSD + 256M RAM + 1核CPU + 500G带宽(就是单日500G流量)，年付费$19.99，折合成人民币大概￥131，使用优惠码还有折扣。支付可以使用支付宝，优惠码:

- `IAMSMART5GRNII`，应该可以享受2.09%的折扣。
- `IAMSMART5TDT48`，$19.99/monthly的套餐可以享受5%左右的折扣。

## vps初始化

购买成功之后，点击"导航栏Services => My Services"，等一小会就会看到机器已经就绪了。然后点击"KiwiVM Control Panel"，就可以进入控制台。

### 1.安装系统

由于vps配置比较低，我们选择一个轻量、方便的linux发行版。

- 点击控制台左侧的"Main Controls"，点击"Kill"按钮来关闭服务器。
- 点击控制台左侧的"Install new OS", 推荐安装"Centos-7-x86_64-minimal";如果想用高版本内核，可以选择"Fedora-23-x86_64";如果你是debian系，你也可以选择"debian-8.0-x86_64-minimal"或者"ubuntu-15.10-x86_64-minimal"。
- 安装完系统之后，系统进入维护状态，维护完成之后页面会显示服务器的root帐号密码，以及SSH端口(不是默认的22端口)，把这些信息记下来。

### 2.修改SSH鉴权

通过之前获得root密码和SSH端口，我们可以访问服务器。windows下可以下载putty或者Xshell来访问，Linux下直接通过ssh命令行访问。由于我们服务器在公网，建议不要通过root进行ssh连接，也不要使用密码登录。

```bash
# 连接服务器
ssh root@[your_ip_addr] -p [your_ssh_port]
# 创建新用户和用户组
groupadd [new_group]
useradd -r -m -g [new_group] [new_user]
# 生成密钥对(会生成公钥id_rsa.pub和私钥id_rsa)
ssh-keygen -t rsa
# 将公钥写入对应用户的authorized_keys，私钥下载下来自己以后登录使用
mkdir -p /home/[new_user]/.ssh/
chmod 0700 /home/[new_user]/.ssh/
cat id_rsa.pub >> /home/[new_user]/.ssh/authorized_keys
chmod 0600 /home/[new_user]/.ssh/authorized_keys
chown -R [new_user]:[new_group] /home/[new_user]/.ssh/
```

编辑`/etc/ssh/sshd_config`，来修改ssh端口和登录配置。搬瓦工在安装系统时就配置了非默认端口，所以我们也可以不修改端口。修改端口和登录方式的原因是，防止被人通过默认端口和密码暴力破解。

```conf
# 修改ssh端口
port [new_ssh_port]

# 不允许root用户通过ssh登录
PermitRootLogin no
# 保证这个选项开启，用户密钥登录
UsePAM yes
# 不允许密码登录
PasswordAuthentication no
```

重启sshd服务，使修改后的sshd配置生效。

```bash
systemctl restart sshd
```

然后，我们就可以使用工具或者ssh，在本地通过密钥登录了。

```bash
# 这个操作是在本地机器，来连接远程服务器
ssh -i id_rsa -p [your_ssh_port] [your_user]@[your_ip_addr]
# 如果连接失败，提示"Permissions 0664 for '***' are too open."，可能是你私钥文件的权限过大导致
chmod 600 id_rsa
```

### 3.安装防火墙

因为我们部署Shadowsocks服务需要开启几个我们指定的端口，为了安全起见，我们最好是安装上防火墙(可以安装firewall或者iptables)，避免其余的端口被人访问。

```bash
# 安装firewalld
yum install firewalld
# 使用systemd托管firewalld，开机自启动
systemctl enable firewalld
systemctl start firewalld
# 添加端口白名单，这里的端口是后面部署shadowsock需要对外开放的端口，如果开启多个端口，可以使用端口段来指定范围
firewall-cmd --zone=public --add-port=[ss_port]/tcp --permanent
# 重启firewalld，使配置生效
firewall-cmd --reload
```

firewalld安装之后，默认开启了dhcpv6-client和ssh两个服务，但是我们可能还是不能在本地ssh访问服务器。为什么呢？主要是因为firewalld的service配置是通过文件配置的，ssh的service配置里面端口是22，而我们又修改了端口，导致无法访问。

```bash
# 将默认service文件复制到/etc下
cp /usr/lib/firewalld/services/ssh.xml /etc/firewalld/services/ssh.xml
# 编辑ssh对应的service文件，将port修改成我们之前制定的sshport
vi /etc/firewalld/services/ssh.xml
systemctl restart sshd
```

## 部署Shadowsocks服务端

整个部署流程很简单

### 1.安装Shadowsocks

```bash
# 安装python的包管理器
yum install python python-pip
# 安装shadowsocks
pip install shadowsocks
```

可以安装gevent来提高Shadowsock性能

```bash
# 安装依赖
yum install libevent
pip install greenlet
# 安装gevent
pip install gevent
```

### 2.编辑配置文件

编辑服务端配置文件`/etc/shadowsocks.json`(如果文件不存在就创建一个)，指定对外开放的ss端口以及加密选项。

- `server`，服务器地址，也就是ss服务端监听的地址
- `server_port`，ss对外端口，也就是ss服务端监听的端口
- `password`，需要加密的密码
- `timeout`，超时时间
- `method`，加密方式，可选"bf-cfb"、"aes-256-cfb"、"des-cfb"、"rc4"，默认加密方式不太安全，推荐使用"aes-256-cfb"
- `fast_open`，如果服务器内核版本在3.7以上，可以设置为true，来降低延迟

如果只开单个端口:

```json
{
    "server":"[your_ip_addr]",
    "server_port":[ss_port],
    "password":"[ss_password]",
    "timeout":300,
    "method":"aes-256-cfb",
    "fast_open": false
}
```

如果想开多个端口:

```json
{
    "server":"[your_ip_addr]",
    "port_password": {
        "[ss_port_1]": "[ss_password_1]",
        "[ss_port_1]": "[ss_password_2]"
    },
    "timeout":300,
    "method":"aes-256-cfb",
    "fast_open": false
}
```

### 3.启动Shadowsocks

可以使用Shadowsocks的服务端以守护进程启动(切记，不要使用root用户去运行shadowsocks，可以切换到之前创建的用户下运行)

```bash
# 启动
ssserver -c /etc/shadowsocks.json -d start
# 关闭
ssserver -c /etc/shadowsocks.json -d stop
```

### 4.托管Shadowsocks

系统会因为一些不可控因素，可能进程崩溃，或者系统关机或重启。所以我们需要托管Shadowsocks，方便开机自启动和进程重启。

可以使用系统systemd来托管，或者安装supervisord(或许比较pythonic)来托管，实现开机自启动及进程重启。如果使用supervisord，需要先安装supervisord，添加supervisord配置，再通过systemd托管supervisord，最后由supervisord托管shadowsock，我觉得有点"脱裤子放屁"的感觉，所以直接使用systemd托管。

编辑`/etc/systemd/system/multi-user.target.wants/shadowsocks.service`配置文件(文件不存在就创建一个)，写入以下内容：

```conf
[Unit]
Description=shaowsocks daemon
After=network.target

[Service]
Type=simple
# 指定运行的用户
User=[new_user]
# 启动命令
ExecStart=/usr/bin/ssserver -c /etc/shadowsocks.json
ExecReload=/bin/kill -HUP $MAINPID
ExecStop=/bin/kill -s QUIT $MAINPID
PrivateTmp=true
KillMode=process
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

编辑完成之后，我们就可以通过systemd来托管`Shadowsocks`了:

```bash
# 重新加载systemd配置
systemctl daemon-reload
systemctl start shadowsocks.service
```

## Shadowsocks客户端

部署完服务端之后，我们只需要在本地机器安装客户端就可以愉快的代理上网(FQ)了。

- [安卓客户端](https://github.com/shadowsocks/shadowsocks-android)，需要自己编译。apk包可以通过google play下载，国内部分商店也提供下载，关键字：影梭。
- [windows客户端](https://github.com/shadowsocks/shadowsocks-windows)
- [ShadowsocksR](https://github.com/shadowsocksr/shadowsocksr-csharp)，适合windows系统
- [原生客户端](https://github.com/ziggear/shadowsocks)，直接通过`pip install shadowsocks`安装，适合linux和mac系统使用
- [Qt客户端](https://github.com/shadowsocks/shadowsocks-qt5)，gui界面，适合linux和mac系统

在本地机器上安装完客户端之后，将我们部署的SS服务的地址、密码和加密方式填入，启动后会建立一个本地端口(127.0.0.1:1080)。可以通过修改配置来更改监听地址和端口。仅以sslocal客户端为例，编辑本地的`/etc/shadowsocks.json`：

- `server`，ss服务端的IP地址
- `server_port`，ss服务端的端口
- `password`，ss密码
- `method`，ss服务端的加密方式
- `local_address`，本地客户端监听地址，默认是127.0.0.1
- `local_port`，本地客户端监听端口，默认是1080
- `timeout`，超时时间

```json
{
    "server":"[your_ss_ip]",
    "server_port":[your_ss_port],
    "password":"[your_ss_password]",
    "method":"aes-256-cfb",
    "local_address": "127.0.0.1",
    "local_port":1080,
    "timeout":300,
}
```

配置完成之后，启动本地客户端

```bash
sslocal -c /etc/shadowsocks.json
```

### 1.浏览器使用

如果我们使用的windows系统下的gui客户端，可以开启pac，就可以直接代理上网了。

还有一种通用的办法，各种系统都适用。客户端启动之后，监听了一个端口(默认127.0.0.1:1080)，我们使用浏览器代理插件，将代理地址和端口都填写成本地客户端监听的地址和端口，就可以愉快的代理上网(FQ)了。

Firefox下的代理插件推荐"pan"，Chrome下的代理插件推荐"SwitchyOmega"。

### 2.终端使用

有时候，我们在命令行也需要下载或者安装软件，但是有些仓库也被墙了。其实，我们也可以通过代理软件连接Shadowsocks来实现终端FQ。

```bash
# 在系统的shell配置中加上一行http_proxy配置，如果是bash则编辑~/.bashrc，如果是zsh则编辑~/.zshrc
export http_proxy="http://127.0.0.1:1080"
# 修改shell配置之后，使其生效
source ~/.zshrc
```
