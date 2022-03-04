---
layout:     post
title:      "升级内核 & 开启BBR"
date:       2017-05-08 15:30:00 +0800
category:   "linux"
tags:       ["kernel", "bbr"]
excerpt:    "使用搬瓦工几天感觉还不错，但是和几个网友交流之后，得到的信息是：系统使用新内核，开启内核`TCP拥塞控制算法BBR`和`fast_open参数`，并且开启ss的`fast_open`选项之后，Shadowsocks服务延迟会得到明显的改善。"
---

使用搬瓦工几天感觉还不错，但是和几个网友交流之后，得到的信息是：系统使用新内核，开启内核`TCP拥塞控制算法BBR`和`fast_open参数`，并且开启ss的`fast_open`选项之后，Shadowsocks服务延迟会得到明显的改善。

手动替换内核重启机器后，发现内核并没有升级到安装的版本。网上搜索之后，得知搬瓦工大部分VPS采用的是OpenVZ架构，和母机共享内核，导致centos 7.3使用的内核版本仍然是2.6系列，并且不能更换内核。虽然搬瓦工现在有部分VPS采用KVM架构，可以更换内核，但是没有低配主机，并且价格也相对较高。考虑之后在搬瓦工退款，在[vultr](https://www.vultr.com)上购买了主机，月付$2.5性价比还算不错，关键是KVM架构，可以升级到最新内核。

## 安装最新版本内核

### 1.查看内核版本

````bash
# 查看内核版本
uname -r
# 查看发行版版本
cat /etc/os-release
````

### 2.添加ELRepo仓库

````bash
# 导入elrepo密钥
rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
# 安装elrepo仓库
rpm -Uvh http://www.elrepo.org/elrepo-release-7.0-2.el7.elrepo.noarch.rpm
````

### 3.安装新版本内核

````bash
# 查看elrepo仓库下相关内核包
yum --disablerepo="*" --enablerepo="elrepo-kernel" list available
# 安装最新的主线稳定内核
yum --enablerepo=elrepo-kernel install kernel-ml
````

### 4.修改grub配置

安装完`kernel-ml`之后，系统没有切换到新内核，重启之后也没有切换到新内核。我们需要将新内核成为默认启动选项，需要修改`grub`配置，将`/etc/default/grub`文件中`GRUB_DEFAULT=saved`修改为`GRUB_DEFAULT=0`:

````conf
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=0
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="consoleblank=0 crashkernel=auto rhgb quiet"
GRUB_DISABLE_RECOVERY="true"
````

重新生成内核配置，并重启机器:

````bash
grub2-mkconfig -o /boot/grub2/grub.cfg
# 重启
halt --reboot
````

重启之后，重新检查内核版本，就可以看到正在运行的内核版本是否正确:

````bash
uname -r
    4.11.0-1.el7.elrepo.x86_64
# 如果想要删除之前的旧内核
rpm -qa | grep kernel
# 删除对应的内核(切记，不要删除正在运行的内核版本)
yum remove kernel-[old_kernel_version]
# 重新生成下内核配置
grub2-mkconfig -o /boot/grub2/grub.cfg
````

## 开启SS的fast_open

在上一篇文章[大王叫我来巡山 -- Shadowsocks](/2017/05/06/shadowsocks-tutorial/)中，解释`fast_open`选项的作用。

````bash
# 查看系统内核fast_open是否开启
cat /proc/sys/net/ipv4/tcp_fastopen
# 如果值是1，说明已开启(3.7+默认开启)，如果值时0，需要修改内核参数
echo "net.ipv4.tcp_fastopen = 1" >> /etc/sysctl.conf
# 使修改的内核配置生效
sysctl -p
````

只要我们系统内核大于3.7，就可以通过修改Shadowsocks配置文件来开启这个选项，用来降低延迟:

````json
{
    "server":"[your_ip_addr]",
    "server_port":[ss_port],
    "password":"[ss_password]",
    "timeout":300,
    "method":"aes-256-cfb",
    "fast_open": true
}
````

## 开启内核BBR算法

BBR是Google 开源的TCP拥塞控制算法，在部署了最新版内核并开启了TCP BBR的机器上，网速甚至可以提升好几个数量级，在丢包率较高的网络中该算法的效果更佳。想要了解BBR算法的原理，可以看下[来自Google的TCP BBR拥塞控制算法解析](http://blog.csdn.net/dog250/article/details/52830576)这篇文章。

`Linux Kernel`从4.9.x版本开启支持tcp_bbr，我们需要保证安装的系统内核版本大于4.9.x即可开启TCP BBR拥塞控制算法。

````bash
# 查看网络堆栈的默认排队机制，默认是pfifo_fast
cat /proc/sys/net/core/default_qdisc
# 查看本机支持的拥塞控制算法，默认是cubic和reno
cat /proc/sys/net/ipv4/tcp_allowed_congestion_control
````

编辑`/etc/sysctl.conf`文件，修改内核参数，添加以下内容(如果`/etc/sysctl.conf`文件中存在`net.ipv4.tcp_congestion_control`配置，最好是先注释掉):

````conf
# TCP-BBR
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
````

修改配置文件完成后:

````bash
# 使修改的内核配置生效
sysctl -p
# 查看当前网络堆栈的默认排队机制
sysctl net.core.default_qdisc
# 查看当前TCP BBR拥塞控制算法
sysctl net.ipv4.tcp_congestion_control
# 查看tcp_bbr内核模块是否启动
lsmod | grep bbr
````

如果操作一切顺利，那么应该可以感受速度有质的提升。

当然除了内核支持的TCP BBR算法外，我们也可以使用其他工具来实现网络加速:

- 锐速，工具收费，有人提供[破解版](https://github.com/91yun/serverspeeder)
- kcptun，基于kcp协议的UDP隧道，可以在openvz架构上使用，可以配合TCP BBR算法使用
