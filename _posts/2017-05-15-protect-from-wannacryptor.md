---
layout:     post
title:      "WannaCryptor防御"
date:       2017-05-15 20:48:00 +0800
category:   "windows"
tags:       ["WannaCryptor", "smb"]
excerpt:    "最近爆发了一种'WannaCryptor'蠕虫病毒，该病毒通过利用NSA开发的ETERNALBLUE(永恒之蓝)攻击工具 -- 对应远程命令执行漏洞MS17-010，攻击window的smbv1协议，然后加密本地所有文件来感染电脑。其实我对windows并不熟悉，这篇文章只是总结下别人的防御方案，来帮需要的人来避免被病毒攻击感染。"
---

最近爆发了一种"WannaCryptor"蠕虫病毒，该病毒通过利用NSA开发的ETERNALBLUE(永恒之蓝)攻击工具 -- 对应远程命令执行漏洞MS17-010，攻击window的smbv1协议，然后加密本地所有文件来感染电脑。其实我对windows并不熟悉，这篇文章只是总结下别人的防御方案，来帮需要的人来避免被病毒攻击感染。

- 被感染后支付BitCoins是无效的，有人尝试过支付但并没有感染，反而是鼓励犯罪。
- 被感染后的加密文件基本无解，因为该病毒使用AES和RAS加密算法，公钥和私钥是唯一配对，只能通过使用唯一的私钥才能解密文件。
- 该病毒的加密强度较大，暴力破解需要很大运算量，即使使用超级计算机也需要很长时间，暴力破解基本没戏。
- 市面上有人宣称能破解加密，基本是扯淡，其实对应工具是恢复磁盘数据，在原数据没有被覆盖前还能有点效果，并且恢复的成功率很小。

根据上面的信息，被感染的机器基本无解，除非能找到对应的唯一私钥。所以没有感染的机器，只能做好防御措施。

_据安全人士逆向分析，病毒会随机选择一部分文件使用内置的RAS公钥来进行加密，目的是解密程序提供的免费解密部分文件功能。能解密的文件路径在f.wnry文件中，使用的私钥也在本地机器。_

## 1.打系统补丁

去年NAS攻击工具泄露之后，今年三月份微软已经发布了MS17-010的补丁，我们首先需要做的就是安装系统补丁。补丁详情见[Microsoft 安全公告 MS17-010 - 严重](https://technet.microsoft.com/zh-cn/library/security/MS17-010)。

具体操作: 开始菜单 => 控制面板 => windows update => 更改设置(开启检查更新) => 检查更新 => 在更新列表中找到对应补丁或者勾选全部补丁 => 安装完补丁之后重启电脑

_安装完补丁之后，重启电脑发现桌面右下角有白字_ **"此 Windows 副本不是正版"** _。哈哈，哭笑不得，可以考虑买微软股票了。_

## 2.修改host

据安全人士分析，病毒启动时会主动访问一个网址[http://www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com](http://www.iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com)。如果连接成功，则退出程序，不执行加密文件操作。

该url本来是不存在的，可能是病毒作者想通过该方式来控制病毒传播的一种手段吧。后来，一位英国安全研究员注册了这个域名，并搭建了服务使该地址可以被访问，拯救了很多机器。但是我国GFW的存在，访问该地址会出现严重丢包，造成连接失败。但就是我们可以通过修改`C:\Windows\System32\drivers\etc\hosts`文件，将该地址指向一个可以访问的ip(比如百度之类网站，或者自己搭建一个80端口的服务):

````conf
iuqerfsodp9ifjaposdfjhgosurijfaewrwergwea.com 180.97.33.108
````

_不过新病毒变种2.0已经出来了，传播逻辑并不会去验证该地址。_

## 3.关闭相应端口或服务

在大陆的大部分电信运营商(中国电信之类)，在几年前就屏蔽了80、135、139、445、8080等端口，在网络中对于目的端口为此类端口的请求，基本都被运营商过滤了。所以这次大陆教育网的病毒感染情况比较严重，其他网络相对安全。不过，对于内网的端口防范我们还是需要警惕，假如有台电脑感染了病毒，然后该电脑接入了某个没有对应端口防御的内网，那么整个内网的机器都将可能被病毒感染。

windows上会默认开启NetBIOS服务，一个网络基本的输入/输出系统，用于数据源和目的地的数据交换。NetBIOS基于TCP/IP协议，开启服务之后会默认监听135、137、138、139和445端口，这些端口很容易被人利用，如果没什么特殊需求可以都关闭。

- 135端口，主要用于为RPC通讯提供服务端口的映射，提供DCOM(分布式组件对象模型)服务。
- 137端口，主要用于局域网中提供计算机名字和IP地址查询服务。
- 138端口，提供NetBIOS环境下的计算机名浏览功能。
- 139端口，基于SMB协议，用于获得NetBIOS/SMB服务(共享文件、打印机或UNIX中的samba服务)。
- 445端口，基于CIFS协议，提供局域网中文件或打印机共享服务(和139端口作用一样)。

### 查看监听端口

通过`netstat`命令可以查看机器上是否开启对应端口:

````bat
netstat -ano | findstr [port]
````

### 关闭135端口

关闭135端口最有效的办法是禁用RPC服务:

````text
控制面板 => 管理工具 => 服务 => Remote Procedure Call => 右键属性 => 修改启动类型设置"禁用"

# 重启RPC
运行 => regedit.exe => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\RpcSs => Start项的键值设置为"0x02" => 重启系统
````

但是很多服务器功能依赖RPC，比如数据库查询、远程拨号、outlook等，我们只需要禁用DOM，同样会达到禁用RPC的效果，实现间接关闭135端口的目的。

````text
运行 => 组件服务\计算机\我的电脑 => 右键属性 => 默认属性 => 去掉勾选"在此计算机上启用分布式DOM" => 重启系统
````

### 关闭137、138、139端口

禁用基于TCP/IP协议下的NetBIOS服务:

````text
控制面板 => 网络和共享中心 => 更改适配器设置 => 正在使用的网络 => 右键属性 => 去掉勾选"" => Internet协议版本4(TCP/IPv4) => 属性 => 高级 => WINS => 勾选"禁用TCP/IP上的NetBIOS" => 重启系统
````

### 关闭445端口

说实话，我对windows关闭开启服务并不熟悉，开启关闭端口也不熟悉，注册表机制实在是过于复杂。下面这部分内容转载自四哥 -- [沈沉舟](http://weibo.com/u/1273725432)的博客内容。

#### 1.禁用共享服务lanmanserver

````bat
sc config lanmanserver start= disabled
net stop srv
````

禁用Server服务之后，SMB会话就无法建立了。但是已连接的连接和监听端口还是会出现在netstat输出中，我们可以通过下面的操作:

````text
运行 => regedit.exe => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NetBT\Parameters => "TransportBindName"项的键值"Device"删除，置空 => 重启系统
````

重启之后通过`netstat -ano`看不到445端口，但是客户端SMB机制也被取消了。

#### 2.禁用NetBT驱动

彻底禁用了系统的SMB机制，客户端和服务端支持都被取消了。

````bat
# 停止NetBT驱动，需要先关掉相应服务
# rdr对应lanmanworkstation服务，srv对应lanmanserver服务
net stop rdr
net stop srv
net stop netbt
````

"NetBios over Tcpip"驱动可以手工停止，但不能手工启动，只能重启才可恢复。为了阻止NetBT驱动在重启OS时自动加载，必须将启动类型由缺省的1改成4:

````text
运行 => regedit.exe => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NetBT => 修改"Start"项的键值为"00000004"(dword类型，即十六进制)

sc config netbt start= disabled
````

#### 3.修改注册表

 第一种禁用了服务端和客户端的SMB支持，但是客户端SMB机制的支持有时候还是需要的。通过修
改注册表可以实现禁用由TCP层直接承载的SMB协议，但继续启用NetBT。

````text
运行 => regedit.exe => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NetBT\Parameters => 新建DWORD类型的"SmbDeviceEnabled"，值为00000000 => 重启系统
````

#### 4.禁用设备

这将彻底禁用系统中的SMB机制，客户端、服务端支持均被取消。

````text
运行 => devmgmt.msc => 查看 => 显示隐藏设备=> 非即插即用驱动程序 => NETBT => 右键属性 => 启动类型修改为"已禁用" => 重启系统
````

#### 5.修改监听的端口

逆向分析netbt.sys之后，发现可以通过注册表改变445/TCP、445/UDP:

````text
运行 => regedit.exe => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NetBT\Parameters\Smb => 将"SessionPort"项键值修改为dword类型的"00000000"，将"DatagramPort"项键值修改为dword类型的"00000000" => 重启系统
````

重启系统之后，系统自动处理成1/TCP、1/UDP。如将SessionPort指定成135/TCP，在争夺中原EPM功能将丧失，SMB功能争夺成功。

如果开启了ipv6之后需要额外修改注册表，达到相同效果。

````text
运行 => regedit.exe
    => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NetBT\Parameters => 修改"UseNewSmb"项的键值为dword类型的"00000000"
    => HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\NetBT\Parameters\Smb => 将"SessionPort"项键值修改为dword类型的"000001bd"，将"DatagramPort"项键值修改为dword类型的"000001bd"
    => 重启系统
````

系统启动IPv6之后，增加了一个驱动smb.sys，处理IPv6下的SMB协议。UseNewSmb非0时将使用smb.sys，该驱动中固化了445/TCP。

## 4.开启防火墙

````text
控制面板 => Windows防火墙 => 打开或关闭Windows 防火墙 => 启用防火墙 => 确认
                         => 高级设置 => 入站规则 => 新建规则 => 端口 => TCP 特定本地端口 445 => 阻止连接 => "域"、"专用"、"计算机"全部勾选 => 输入名称，确认
````

----
引用:

[如何关闭445/TCP口](http://scz.617.cn/windows/200602071156.txt)
