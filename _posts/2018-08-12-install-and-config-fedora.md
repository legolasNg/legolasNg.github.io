---
layout:    post
title:     "fedora的安装和配置"
date:      2018-08-12 18:00:00 +0800
category:  "linux"
tags:      ["linux", "Fedora"]
excerpt:   "其实这个也不算是教程，只是自己换电脑之后安装fedora的记录，避免下次重新安装系统时会有遗漏，分享出来给人参考。linux内核现在已经更新到4.17.14版本了，现在linux发行版易用性也原没有远古时期那么难用，如果你选择一个社区繁荣的发行版，绝对会发现一点也不反人类。推荐的linux发行版有 **Ubuntu**、**Fedora**、**Arch**，绝对不要去使用所谓的'国产操作系统'，大部分无非是国外流行发行版的分支，然后自定义了一些主题、工具，反而出现很多问题之后没有技术支持。"
---

其实这个也不算是教程，只是自己换电脑之后安装fedora的记录，避免下次重新安装系统时会有遗漏，分享出来给人参考。linux内核现在已经更新到4.17.14版本了，现在linux发行版易用性也原没有远古时期那么难用，如果你选择一个社区繁荣的发行版，绝对会发现一点也不反人类。推荐的linux发行版有 **Ubuntu**、**Fedora**、**Arch**，绝对不要去使用所谓的'国产操作系统'，大部分无非是国外流行发行版的分支，然后自定义了一些主题、工具，反而出现很多问题之后没有技术支持。

关于linux的使用途径：由于桌面发行版在市场上的的占有份额，国内外很多软硬件厂商并没有开发对应的软件或者硬件驱动，即使有也仅仅能用且功能不全。虽然易用性和兼容性已经很好的得到了进步和发展，但是使用中难免会遇到很多问题，还是不建议日常使用。如果想使用linux学习科研，你会获得很多社区资源;如果是娱乐，linux上面的软件也只能满足一些基本需求;如果是游戏，不好意思Nvidia和AMD的驱动支持，游戏厂商的软件支持，远没有达到Windows平台的程度(虽然情况在好转)。

## 安装fedora

访问[Fedora官网](https://getfedora.org/)，下载最新版Fedora Workstation的ISO镜像。

如果你是linux用户，将IOS镜像直接写入U盘即可

```bash
dd bs=4M if=/path/to/fedora.iso of=/dev/sdx status=progress && sync
```

如果是Windows用户，在官网下载[Fedora Media Writer](https://getfedora.org/fmw/FedoraMediaWriter-win32-4.1.1.exe)，将ISO镜像刻录到U盘即可。刻录完成之后，插上U盘重启电脑，修改BOIS启动项通过U盘启动，就可以进入Fedora的安装界面，整个过程很简单。

主要步骤是: 选择语言 => 本地化(键盘布局、时间和日期) => 系统安装，一般选择语言之后本地化配置就有了默认配置，我们一般不需要修改。主要步骤在系统安装这步。点击系统安装，选择系统安装到哪块硬盘，如果没有安装经验，在"存储配置"中选"自动"即可，然后点击完成就会自动安装好系统。如果硬盘中已经存在其他系统可能会被覆盖，我们最好在"存储配置"中选择"自定义"。

在"存储配置"中选择"自定义"后，点击"完成"就会进入分区界面。我们选择"标准分区"类型，将之前预留的分区点击"-"按钮进行删除，重新格式化。一般我们需要创建4个分区，可以根据需要适当增减:

- 根分区`/`，用于系统相关的目录，最先挂载，其他分区也会挂载在根分区下，分配空间至少15G

- 启动分区`/boot`，用于存放包含内核、ramdisk镜像以及bootloader配置文件和bootloader stage，分配空间至少512M(建议1G)，也可以不单独设置分区

- ESP分区`/boot/efi`，用于使用UEFI启动的ESP文件系统，分配空间至少200M(建议512M)，如果是legacy only启动则没必要设置，如果是双系统我们可以公用windows已经分配好的ESP分区

- 主目录分区`/home`，用于保存普通用户的目录文件，具体大小根据我们情况适当分配

- 交换分区`/swap`，用于提供能够被作为虚拟内存的内存空间(交换文件swap file也能实现同样的效果，还能动态调整大小或者移除)，分配空间一般是2倍内存大小，如果内存够大也可以不设置

## 软件源配置

**包管理系统** 是在linux中自动安装、配制、卸载和升级软件包的工具组合，在各种发行版中有不同的软件包管理系统，主要分为红帽系的"RPM软件包管理系统"和Debian系的"dpkg软件包管理系统"。

我们通过配置本地的软件源，使用包管理器便可以获取线上仓库中的各种软件，不同的仓库一般包含不同的软件，可以根据需要配置多个仓库来满足使用需求。

### 1.添加RPMFusion源

一般发行版为了版权纠纷，在安装完成后的系统中会自带官方的软件源，官方软件源中包含自由软件和厂商自己开发的非自由软件。如果我们想获取一些非自由软件(部分受版权保护的解码器、商业软件)，就需要手动配置第三方的软件源。

```bash
## free仓库
sudo dnf install http://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm

## non-free仓库
sudo dnf install http://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
```

最后运行`sudo dnf makecache`生成缓存。

当然Fedora也慢慢开始向官方仓库添加第三方的非自由软件支持，主要包括`phracek-PyCharm`、`google-chrome`、`rpmfusion-nonfree-nvidia-driver`、`rpmfusion-nonfree-steam`，默认都不开启，需要手动开启:

```bash
sudo dnf install fedora-workstation-repositories
sudo dnf config-manager --set-enabled
```

### 2.替换官方软件源

官方软件源一般架设在国外，国内获取速度较慢，所以一般需要手动将官方软件源切换到国内对应的镜像软件源，这里推荐中科大的ustc镜像源、清华的tuna镜像源。

将以下保存为`fedora.repo`:

```ini
[fedora]
name=Fedora $releasever - $basearch - ustc
failovermethod=priority
baseurl=https://mirrors.ustc.edu.cn/fedora/releases/$releasever/Everything/$basearch/os/
#metalink=https://mirrors.fedoraproject.org/metalink?repo=fedora-$releasever&arch=$basearch
enabled=1
metadata_expire=7d
repo_gpgcheck=0
type=rpm
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-$releasever-$basearch
skip_if_unavailable=False

[fedora-debuginfo]
name=Fedora $releasever - $basearch - Debug - ustc
failovermethod=priority
baseurl=https://mirrors.ustc.edu.cn/fedora/releases/$releasever/Everything/$basearch/debug/tree/
#metalink=https://mirrors.fedoraproject.org/metalink?repo=fedora-debug-$releasever&arch=$basearch
enabled=0
metadata_expire=7d
repo_gpgcheck=0
type=rpm
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-$releasever-$basearch
skip_if_unavailable=False

[fedora-source]
name=Fedora $releasever - Source - ustc
failovermethod=priority
baseurl=https://mirrors.ustc.edu.cn/fedora/releases/$releasever/Everything/source/tree/
#metalink=https://mirrors.fedoraproject.org/metalink?repo=fedora-source-$releasever&arch=$basearch
enabled=0
metadata_expire=7d
repo_gpgcheck=0
type=rpm
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-$releasever-$basearch
skip_if_unavailable=False
```

将以下保存为`fedora-updates.repo`:

```ini
[updates]
name=Fedora $releasever - $basearch - Updates - ustc
failovermethod=priority
baseurl=https://mirrors.ustc.edu.cn/fedora/updates/$releasever/Everything/$basearch/
#metalink=https://mirrors.fedoraproject.org/metalink?repo=updates-released-f$releasever&arch=$basearch
enabled=1
repo_gpgcheck=0
type=rpm
gpgcheck=1
metadata_expire=6h
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-$releasever-$basearch
skip_if_unavailable=False

[updates-debuginfo]
name=Fedora $releasever - $basearch - Updates - Debug - ustc
failovermethod=priority
baseurl=https://mirrors.ustc.edu.cn/fedora/updates/$releasever/Everything/$basearch/debug/tree/
#metalink=https://mirrors.fedoraproject.org/metalink?repo=updates-released-debug-f$releasever&arch=$basearch
enabled=0
repo_gpgcheck=0
type=rpm
gpgcheck=1
metadata_expire=6h
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-$releasever-$basearch
skip_if_unavailable=False

[updates-source]
name=Fedora $releasever - Updates Source - ustc
failovermethod=priority
baseurl=https://mirrors.ustc.edu.cn/fedora/updates/$releasever/Everything/source/tree/
#metalink=https://mirrors.fedoraproject.org/metalink?repo=updates-released-source-f$releasever&arch=$basearch
enabled=0
repo_gpgcheck=0
type=rpm
gpgcheck=1
metadata_expire=6h
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-$releasever-$basearch
skip_if_unavailable=False
```

最后运行`sudo dnf makecache`生成缓存

### 3.flatpak包支持

在类UNIX系统中，一个版本的软件只会存在系统中一份，依赖于该软件的其他软件在安装时，需要先解决依赖安装上所有对应的依赖包(很多软件发行还依赖于linux发行版的不同版本)。如果你想像Windows下一样，一个软件打包好所有的资源和依赖，各个软件之间独立存在，我想你需要flatpak。flatpak之类的打包方式在linux中还属于新事物，很多软件都还没有支持，所以能安装的软件不多，一般都是一些商业软件。

```bash
sudo dnf install flatpak

## 添加flatpak的remote
sudo flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

## 删除remote
sudo flatpak remote-delete flathub
```

在 [flathub](https://flathub.org/home) 找相应的app，可以安装flatpak软件:

```bash
## 安装flatpak包
sudo flatpak install flathub com.valvesoftware.Steam
sudo flatpak install flathub com.visualstudio.code

## 运行app
flatpak run flathub com.valvesoftware.Steam

## 卸载app
sudo flatpak uninstall flathub com.valvesoftware.Steam

## 更新apps
sudo flatpak update
```

### 4.snap包支持

snap包是Canonical公司维护的一种新的打包系统，类似于红帽维护的flatpak。

```bash
sudo dnf install snap

## 安装软件中心的snap插件
sudo dnf install gnome-software-snap
```

在 [snapcraft](https://snapcraft.io/store) 找相应的app，可以安装snap软件，也可以通过软件中心来安装:

```bash
##  查找app
sudo snap find "vlc"

## 安装app
sudo snap install "vlc"

## 卸载app
sudo snap remove "vlc"
```

### 5.添加fedy源

fedy源可以方便在fedora上安装第三方软件，fedy为使用者准备了很多集成解决方案(比如mp3、Oracle Java)，依赖于RPMFusion源。

```bash
sudo dnf install https://dl.folkswithhats.org/fedora/$(rpm -E %fedora)/RPMS/fedy-release.rpm

sudo dnf install fedy
```

### 6.解决方案

如果软件中心打开后，长时间无响应或者处于"正在加载软件目录"的状态，可以重建rpm数据库:

```bash
sudo rpmdb -v --rebuilddb
```

## 配置修改

### 1.修改dnf配置

修改`/etc/dnf/dnf.conf`配置文件

```ini
[main]
; 是否开启gpg校验
gpgcheck=1
; 允许保留多少旧内核包
installonly_limit=3
; 删除软件同时删除依赖包
clean_requirements_on_remove=True
; 查找最快镜像
fastestmirror=true
; 下载增量包
deltarpm=true
; 最大并发下载数量
max_parallel_downloads=6
```

### 2.修改SELinux配置

selinux是红帽系发行版自带的安全子系统，对于桌面版用户这个子系统意义不大，但是卸载不掉，只能完全禁用。

查看SELinux状态:

```bash
/usr/sbin/sestatus -v
```

如果状态是enabled，则代表SELinux开启，需要修改`/etc/selinux/config`配置文件，将SELINUX修改为disabled:

```ini
SELINUX=disabled
```

### 3.设置root密码和主机名

linux系统中最高权限用户是root，类似于Windows系统中的administrator。因为权限过高，不建议在root权限下操作，不要加入"root敢死队"。Fedora安装之后，以普通用户启动并且没有设置root密码，默认给安装时设置的用户赋予了sudo权限，如果我们想修改root密码，按照下面操作即可。我们也可以给其他用户赋予sudo权限。

```bash
## 切换到root
sudo su
## 修改密码
passwd root

## 设置主机名
sudo hostnamectl --static set-hostname [localhost]
```

### 4. 修改sudo配置

修改`/etc/sudoers`配置文件，使普通用户通过sudo命令临时获得root权限:

```bash
root        ALL=(ALL)       ALL

%wheel      ALL=(ALL)       ALL
[USERNAME]  ALL=(ALL)       ALL
```

或者其他需要sudo的用户，可以将用户添加到wheel组，将wheel添加到sudo配置中:

```bash
sudo usermod -aG wheel [USERNAME]
```

### 5.家目录文件夹切换为英文

```bash
## 修改系统当前语言
export LANG=en_US

## 通过命令修改主目录下的文件夹
xdg-user-dirs-gtk-update

## 将语言环境修改回中文
export LANG=zh_CN.UTF-8
```

还可以通过修改`~/.config/user-dirs.dirs`配置文件;
再或者通过"设置"=>"Region & Language"=>"语言"，将语言修改为英文后注销，重新登陆后会弹出窗口修改主目录文件夹，修改完之后将语言修改回中文，然后再注销登陆一次，弹出窗口选择不更改。

## 安装软件

### 1.常用软件

```bash
sudo dnf install htop
sudo dnf install screenfetch
sudo dnf install vim git
sudo dnf install zsh
sudo dnf install gcc gcc-c++ gdb
sudo dnf install mpv
sudo dnf install unrar unzip
```

### 2.安装chrome

```bash
## 安装第三方软件源
sudo dnf install fedora-workstation-repositories

## 启用chrome仓库
sudo dnf config-manager --set-enabled google-chrome

## 安装
sudo dnf install google-chrome-stable
```

### 3.安装steam

`steam`是vavle公司的游戏分发平台，在上面可以购买很多PC游戏，随着vavle的steamos推进，vavle自己以及很多游戏厂商的游戏都出了linux版(大部分是原生支持，少数是wine模拟的，但是也不需要自己解决wine的兼容问题):

```bash
sudo dnf install fedora-workstation-repositories

sudo dnf config-manager --set-enabled rpmfusion-nonfree-steam

sudo dnf install steam
```

### 4.安装gnome-tweaks

一款对gnome界面調整的软件，可以修改主题、字体、gnome扩展、窗口、开机自启动等:

```bash
sudo dnf install gnome-tweaks

## 安装浏览器gnome扩展组件
sudo dnf install chrome-gnome-shell

## 安装菜单编辑器
sudo dnf install menulibre
```

通过上面安装浏览器插件之后，我们可以访问[gnome扩展](https://extensions.gnome.org/)来安装所需要的插件，推荐常见的gnome扩展插件:

- Alternative tab

- Applications menu

- Dash to dock

- Drop down terminal

- Launch new instance

- Media player indicator

- Openweather

- Places Status Indicator

- Removable Drive Menu

- Sound input & output device chooser

- Topicons

- User themes

- Windows list

### 5.安装nautilus插件

在文件管理器中，加入右键"在终端打开":

```bash
sudo dnf install gnome-terminal-nautilus nautilus-search-tool
```

### 6.安装vscode

```bash
## 导入密钥
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc

## 创建repo
sudo sh -c 'echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo'

## 安装vscode
sudo dnf check-update
sudo dnf install code
```

### 7.安装non-free解码器

```bash
## 开启openh264仓库
sudo dnf config-manager --set-enabled fedora-cisco-openh264

## 安装解码器
sudo dnf install gstreamer-plugins-base gstreamer1-plugins-base gstreamer-plugins-bad gstreamer-plugins-ugly gstreamer1-plugins-ugly gstreamer-plugins-good-extras gstreamer1-plugins-good-extras gstreamer1-plugins-bad-freeworld ffmpeg gstreamer-ffmpeg ffmpeg-libs xvidcore libdvdread libdvdnav lsdvd libmpg123 gstreamer1-plugin-openh264 gstreamer1-libav
```

也可以在安装好的fedy中，点击`Multimedia codecs`解决方案来安装。

### 8.安装音频组件

```bash
sudo dnf install pulseaudio
```

如果系统没有声音，可能是alsamixer配置问题，默认是静音。通过命令`alsamixer`启动，按下`F6`选择声卡，将`Auto-Mute Mod`一项修改为"disabled"。

### 9.安装fcitx

```bash
sudo dnf install fcitx fcitx-cloudpinyin fcitx-configtool fcitx-gtk2 fcitx-gtk3
```

如果使用的是`Wayland`显示管理器，在`/etc/environment`中加入:

```bash
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
```

由于系统自带ibus输入法，ibus和gnome依赖关系，卸载ibus可能会删除gnome。只需要在设置"Region & Language" => "输入源"中删除中文相关的输入源，只保留英语(美国)即可。

### 10.安装shadowsocks-qt5

```bash
## 添加shadowsocks的Copr源
sudo dnf copr enable librehat/shadowsocks

## 安装
sudo dnf update
sudo dnf install shadowsocks-qt5

## 出现libbotan-2.so.5 was missing的问题，是由于libbotan版本过高，做个软链接即可解决
sudo ln -s /usr/lib64/libbotan-2.so.7 /usr/lib64/libbotan-2.so.5

## 命令行使用代理，只需要设置环境变量即可，协议名与开放端口协议一致:
export http_proxy="socks5://127.0.0.1:1080"
export https_proxy="socks5://127.0.0.1:1080"
```

### 11.安装字体和主题

```bash
## 安装numix主题
sudo dnf install numix-gtk-theme

## 安装numix和numix-circle图标
sudo dnf install numix-icon-theme numix-icon-theme-circle

## 安装paper图标
sudo dnf config-manager --set-enabled user501254-Paper
sudo dnf install paper-gtk-theme paper-icon-theme

## 安装materia主题
sudo dnf copr enable tcg/themes
sudo dnf install materia-theme

## 安装evopop主题和图标
sudo dnf install evopop-gtk-theme evopop-icon-theme

## 安装yaru主题
sudo dnf copr enable deadmozay/yaru-theme
sudo dnf install yaru-gtk3

## 安装思源字体(等宽、衬线)
sudo dnf install adobe-source-code-pro-fonts adobe-source-sans-pro-fonts adobe-source-serif-pro-fonts
## 安装思源黑体(建议中文字体使用这个)
sudo dnf install adobe-source-han-sans-cn-fonts
```

安装字体和主题后，通过`gnome-tweaks`来设置字体和主题。更多的主题，可以在fedy选择你想要的，然后安装。

### 12.安装网易云音乐

网易云和deepin合作，开发了linux版的网易云音乐和有道云词典，但是只对deepin和ubuntu打了包，所以debian系发行版基本上可以直接安装。红帽系发行版，需要自己手动解决:

```bash
## 安装解码器
sudo dnf install gstreamer-plugins-base gstreamer1-plugins-base gstreamer-plugins-bad gstreamer-plugins-ugly gstreamer1-plugins-ugly gstreamer-plugins-good-extras gstreamer1-plugins-good-extras gstreamer1-plugins-bad-freeworld ffmpeg gstreamer-ffmpeg ffmpeg-libs xvidcore libdvdread libdvdnav lsdvd libmpg123
## 安装依赖(1.1版本的网易云音乐将很多库都打包了，所以需要手动解决的依赖很少)
sudo dnf install vlc

## 下载官网的deb包
mkdir netease-cloud-music
cd netease-cloud-music
wget http://d1.music.126.net/dmusic/netease-cloud-music_1.1.0_amd64_ubuntu.deb

## 解压deb包
ar -xvf netease-cloud-music_1.1.0_amd64_ubuntu.deb
##  解压data包(control.tar.gz主要是用于文件校验，debian-binary是deb的版本)
tar -xvf data.tar.xz

## 复制文件到/usr
sudo cp -r usr/* /usr/
```

### 13.安装Clion

`Clion`是Jetbrain公司开发的C/C++语言的IDE，该公司基本所有产品都有linux版而且安装简单，其他产品安装步骤雷同:

```bash
## 从jetbrains下载最新的clion包
wget https://download.jetbrains.com/cpp/CLion-2018.2.tar.gz

## 解压到当前目录
tar xzvf CLion-2018.2.tar.gz

## 复制到/opt目录下
sudo cp -R ./clion-2018.2 /opt/

## 执行clion安装脚本
/opt/clion-2018.2/bin/clion.sh
```

最近发现Jetbrain公司还有个产品 -- `Toolbox`，可以用来管理该公司旗下的所有产品，用起来很方便。可以通过Fedy来安装`Toolbox`，r然后再通过`Toolbox`安装其他IDE。

### 14.安装telegram

微信没有linux版本，但是可以使用网页版，据说有人开发了第三方的Electron版微信 -- [weweChat](https://github.com/trazyn/weweChat) 和 [electronic-wechat](https://github.com/geeeeeeeeek/electronic-wechat)。个人有洁癖，除非没得选，不然绝对不用Electron客户端，太臃肿！

当然还有其他原因，因为微信会屏蔽聊天消息，对聊天体验造成极大影响，所以尽量不用微信。`telegram`是端对端加密，而且不受国内管制，所以我选择telegram(题外话:steam新出的IM也是端对端，功能齐全，可以考虑)。

```bash
sudo dnf install telegram-desktop
```

Notes: __国内使用telegram需要配合代理使用__

### 15.删除不必要的软件

gnome自带了很多软件，由于个人有洁癖，所以卸载掉没用的软件(还有部分因为和gnome强依赖，卸载会导致卸载掉gnome，所以放弃了):

```bash
## 删除gnome自带
sudo dnf autoremove simple-scan
sudo dnf autoremove cheese
sudo dnf autoremove gnome-maps
sudo dnf autoremove gnome-contacts
sudo dnf autoremove gnome-weather
sudo dnf autoremove gnome-clocks
sudo dnf autoremove gnome-online-miners

## 删除ibus自带
sudo dnf autoremove ibus-libpinyin
sudo dnf autoremove ibus-libzhuyin
sudo dnf autoremove ibus-hangul
sudo dnf autoremove ibus-kkc
sudo dnf autoremove ibus-m17n
```

### 16.安装zsh

发行版自带的shell一般是bash，如果想体验更现代化的shell，建议试试`zsh`或者`fish`，对命令补全和命令行扩展更好。

```bash
# 安装zsh
sudo dnf install zsh
# 将zsh设置为当前用户的默认shell
chsh -s /bin/zsh
# 将zsh设置为root用户的默认shell
sudo chsh -s /bin/zsh
```

我们可以选择性安装`powerline`字体，可以为zsh提供一些状态和提示效果:

```bash
git clone https://github.com/powerline/fonts.git
cd fonts
./install.sh
```

还可以选择性安装`awesome-powerline`字体，使命令行提供更酷炫的效果:

```bash
git clone https://github.com/gabrielelana/awesome-terminal-fonts.git
cd  awesome-terminal-fonts
./install.sh
```

安装zsh之后，必须要安装`oh-my-zsh`，这是一个开源的社区zsh配置框架，自带了很多有用的功能、插件、主题，可以让我们上手即用:

```bash
## 克隆oh-my-zsh仓库
git clone https://github.com/robbyrussell/oh-my-zsh.git ~/.oh-my-zsh

## 克隆powerlevel9k主题，可以使用oh-my-zsh自带的那几款主题
git clone https://github.com/bhilburn/powerlevel9k.git ~/.oh-my-zsh/custom/themes/powerlevel9k

## 备份之前的zsh配置
cp ~/.zshrc ~/.zshrc.backup

## 使用oh-my-zsh提供的配置模板
cp ~/.oh-my-zsh/templates/zshrc.zsh-template ~/.zshrc
```

通过`vim ~/.zshrc`修改配置，自定义我们想要的内容:

```zsh
## 设置主题
ZSH_THEME="powerlevel9k/powerlevel9k"

## 设置默认用户
DEFAULT_USER="$USER"

## 开启powerlevel9k主题的awesome字体
POWERLEVEL9K_MODE='awesome-fontconfig'

## 加载zsh插件，前提是已经安装在~/.oh-my-zsh/plugins目录下
plugins=(autojump dnf git pip systemd)

## 我们还可以在zshrc配置中，添加自己自定义的方法、命令别名
alias setproxy="export ALL_PROXY=socks5://127.0.0.1:1080"
alias unsetproxy="unset ALL_PROXY"
```

执行`source ~/.zshrc`使配置生效。

### 17.安装Vim

Vim是终端编辑器，具有强大的功能和海量扩展。我们可以通过`vim-plug`、`vundle`来管理插件，为Vim添加我们需要的功能:

```bash
## 安装vim
sudo dnf install vim

## 安装Vim插件管理
curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

首先我们编辑Vim配置文件`~/.vimrc`，让Vim加载`vim-plug`插件管理器:

```vimrc
" 加载vim-plug插件管理器
call plug#begin('~/.vim/plugged')

" 添加我们需要的插件，可以通过多种方式添加
" 托管在github的插件，直接通过username/reponame就可以加载
" 下载到本地的，通过路径加载

" vim状态栏插件
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'

" vim的git插件
Plug 'tpope/vim-fugitive'
Plug 'gregsexton/gitv'

" vim的补全插件
Plug 'MarcWeber/vim-addon-mw-utils'
Plug 'tomtom/tlib_vim'
Plug 'garbas/vim-snipmate'
Plug 'honza/vim-snippets'

" 大纲式导航，将编辑中的文件生成一个大纲，包含类、方法、变量等。需要先安装依赖ctags
Plug 'majutsushi/tagbar'

" vim的搜索插件
Plug 'kien/ctrlp.vim'
Plug 'rking/ag.vim'

" vim的目录树插件
Plug 'scrooloose/nerdtree'
Plug 'Xuyuanp/nerdtree-git-plugin'

" vim的文字匹配插件
Plug 'godlygeek/tabular'
" markdown插件
Plug 'plasticboy/vim-markdown'

" 完成插件系统初始化
call plug#end()


" 配置vim，和插件无关
" 关闭兼容模式
set nocompatible
" 设置编码
set encoding=utf-8
set fileencodings=utf-8,gbk,default,latin1
" 文件类型检查，同时打开基于文件类型的插件和缩进
filetype plugin indent on
" 开启语法高亮
syntax on

" 设置行号
set number
" 开启右下角状态列显示
set ruler
" 设置历史记录数
set history=1000
" 设置缩进
set autoindent
set smartindent
set tabstop=4
set softtabstop=4
set shiftwidth=4
set expandtab
" 设置搜索
set hlsearch
set incsearch
set smartcase
```

配置完vimrc，同`vim`命令进入vim，然后输入`:PlugInstall`指令来安装插件，等待插件安装完成，我们就可以使用了(当然插件也是可配置的，在vimrc文件后面添加即可)。

### 18.安装jdk

fedora默认安装了openjdk，如果需要替换成官方jdk可以通过以下操作。先去[Oracle官网](https://www.oracle.com/technetwork/java/javase/downloads/index.html)下载最新版本的JDK和JRE:

```bash
## 解压压缩包
tar xzvf jre-10.0.2_linux-x64_bin.tar.gz
tar xzvf jdk-10.0.2_linux-x64_bin.tar.gz

## 新建目录，将文件复制到制定路径
sudo mkdir -p /usr/local/java
sudo cp -r jdk-10.0.2_linux-x64_bin/jdk-10.0.2 /usr/local/java/
sudo cp -r jre-10.0.2_linux-x64_bin/jre-10.0.2 /usr/local/java/
```

编辑`/etc/profile`文件，将所需要的环境变量添加进来:

```bash
JAVA_HOME=/usr/local/java/jdk-10.0.2
JRE_HOME=/usr/local/java/jre-10.0.2
CLASS_PATH=.:$JAVA_HOME/lib:$JRE_HOME/lib
PATH=$PATH:$JAVA_HOME/bin:$JRE_HOME/bin
export JAVA_HOME JRE_HOME CLASS_PATH PATH
```

然后通过一下命令将jdk版本切换到制定的Oracle版本:

```bash
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/local/java/jdk-10.0.2/bin/java" 1
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/local/java/jdk-10.0.2/bin/javac" 1
sudo update-alternatives --install "/usr/bin/javaws" "javaws" "/usr/local/java/jdk-10.0.2/bin/javaws" 1

sudo update-alternatives --set java /usr/local/java/jdk-10.0.2/bin/java
sudo update-alternatives --set javac /usr/local/java/jdk-10.0.2/bin/javac
sudo update-alternatives --set javaws /usr/local/java/jdk-10.0.2/bin/javaws
```

然后通过`source /etc/profile`使环境变量生效