---
layout:    post
title:     "Rime输入法配置"
date:      2022-06-22 03:30:00 +0800
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

## 自定义Rime



