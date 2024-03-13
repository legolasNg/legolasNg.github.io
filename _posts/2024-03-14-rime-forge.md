---
layout:    post
title:     "Rime输入法配置"
date:      2024-03-14 04:20:00 +0800
category:  "input-method"
tags:      ["Rime"]
excerpt:   "GNOME桌面中的ibus框架自带有拼音输入法，但是在Jetbrains全家桶IDE中使用效果很差。久仰`Rime`输入法框架的大名，一直畏难于繁琐的配置没敢上手，现在为了Fedora系统下的工作效率想尝试一下。"
---

GNOME桌面中的ibus框架自带有拼音输入法，但是在Jetbrains全家桶IDE中使用效果很差。久仰`Rime`输入法框架的大名，一直畏难于繁琐的配置而没敢上手，现在为了Fedora系统下的工作效率想尝试一下。

## 安装Rime

`RIME`是一个跨平台的输入法算法框架，在不同的平台上有不同的输入法前端实现。我们需要根据系统上对应的输入法框架安装对应的rime包。

````bash
## fcitx
sudo dnf install fcitx5-rime

## ibus
sudo dnf install ibus-rime
````

根据对应的输入法框架编辑 `/etc/environment` 来设置IM环境变量，添加:

````bash
## fcitx
GTK_IM_MODULE=fcitx5
QT_IM_MODULE=fcitx5
XMODIFIERS=@im=fcitx5

## ibus
GTK_IM_MODULE=ibus
QT_IM_MODULE=ibus
XMODIFIERS=@im=ibus
````

运行 `source /etc/environment` 使环境变量生效，若想要使环境变量全局生效需要重启。

fcitx输入法框架可以通过`fcitx5-configtool`来添加输入法(可能安装完fcitx5-rime已经自动添加了)；ibus可以`ibus-setup`来添加输入法(可能还需要继续在设置->键盘中添加输入源)。

## 安装Plum

`東風破Plum`是一个官方的配置管理工具，我们可以通过这个工具安装其他人在github上面发布的一些输入法定制配置。

````bash
git clone --depth=1 https://github.com/rime/plum
cd plum

## 安装官方预设的一些输入法配置
bash rime-install :preset

## 安装github仓库中的指定文件
bash rime-install lotem/rime-forge@master/lotem-packages.conf
````

## 第三方配置

`Rime`功能强大，用户可以自己定义输入方案、词库和各种扩展功能。新手可以通过`Plum`安装其他人发布的一些配置，或者自己自由搭配。下面推荐几个：

### rime-ice

仓库地址：[iDvel/rime-ice](https://github.com/iDvel/rime-ice)

````bash
bash rime-install iDvel/rime-ice:others/recipes/full
````

### rime-forge

仓库地址：[riverscn/rime-forge](https://github.com/riverscn/rime-forge)

````bash
bash rime-install riverscn/rime-forge
````

### rime-setting

仓库地址：[Iorest/rime-setting](https://github.com/Iorest/rime-setting)

````bash
bash rime-install Iorest/rime-setting
````

### oh-my-rime

仓库地址：[Mintimate/oh-my-rime](https://github.com/Mintimate/oh-my-rime)

````bash
bash rime-install Mintimate/oh-my-rime
````

> 安装第三方配置之前，如果不熟悉默认的配置或者已有的配置，建议先备份原有配置然后删除，再覆盖安装第三方的输入法方案。

## 注意事项

1. `Rime`输入法的默认配置目录，用户可以根据自己需要自行调整：
    - MacOS
        + Squirrel(鼠须管): ~/Library/Rime/
    - Windows
        + Weasel(小狼毫): %APPDATA%/Rime
    - Linux 
        + iBus: ~/.config/ibus/rime
        + Fcitx5: ~/.local/share/fcitx5/rime

2. 首次安装完`Rime`之后，需要重启或者注销，至少也得重新打开对应的输入法。

3. 导入第三方配置或者自己调整配置之后，记得点击`Rime`输入法界面的“部署”。

4. 如果第三方配置有**多套输入法方案**，可以使用CTRL+~来切换输入法方案。