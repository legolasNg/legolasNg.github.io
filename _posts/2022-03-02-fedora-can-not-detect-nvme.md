---
layout:    post
title:     "Fedora检测不到Nvme"
date:      2022-03-02 20:22:00 +0800
category:  "Nvme"
tags:      ["Nvme", "AHCI"]
excerpt:   "昨天晚上本来想着更新一下Grub主题，没成想Grub主题生效之后，识别不到Windows启动分区了。折腾了好几天，才修复多系统引导。"
---


昨天晚上本来想着更新一下Grub主题，没成想Grub主题生效之后，识别不到Windows启动分区了。折腾了好几天，才修复多系统引导。

## 无头绪尝试

> `GRUB` 是Linux系统下的引导加载程序，配合`os-probe`可以实现对其他Linux和Windows系统的识别，从而实现多系统引导。

### 尝试1 - 重新生成配置

刚开始，我以为是第三方的主题安装脚本出了问题，导致生成的Grub配置出了差错。手动重新生成Grub配置，发现还是没解决问题。

````bash
# 其他发行版和fedora34之前版本
sudo grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg

# fedora34之后版本
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
````

### 尝试2 - 调整Grub参数

重新检查了一下Grub主题的安装脚本，发现有调整Grub参数的行为。于是上wiki查阅了Grub使用手册，确定了多系统识别的参数。修改`/ect/default/grub`文件:

````bash
GRUB_DISABLE_OS_PROBER=false
````

文件修改之后，再次使用`grub2-mkconfig`重新生成配置，发现还是无法识别到Windows。

### 尝试3 - 手动修改配置

`os-prober`识别不到其他系统，那就手动添加到配置文件`/boot/grub2/grub.cfg`里面:

````bash
if [ "${grub_platform}" == "efi" ]; then
    menuentry "Microsoft Windows 10 UEFI/GPT" {
        insmod part_gpt
        insmod fat
        insmod chain
        search --no-floppy --fs-uuid --set=root $hints_string $fs_uuid
        chainloader /EFI/Microsoft/Boot/bootmgfw.efi
    }
fi
````

此时，配置里面的`$hints_string`和`$fs_uuid`需要根据本机的实际情况手动指定。通过`blkid`命令确定Windows系统对应的EFI分区UUID，来确定这两个变量值。

````text
--hint-efi=nvmexxx,gpt1 xxxx-xxxx-xxxx
````

运行`blkid`命令之后发现找不到对应的硬盘分区，`fdisk -l`命令也找不到对应的磁盘。这时大概就找到症结所在了，Linux系统识别不到对应的nvme磁盘。

> 我电脑总共有三块硬盘：一块M.2接口的nvme固态硬盘用于安装Windows系统，一块SATA接口的普通固态硬盘用于安装Fedora系统，一块SATA接口的机械硬盘用来放Windows下的各种文件和游戏

## 继续迷茫

在一系列的无头绪尝试后，"瞎猫碰到死耗子"，终于算是摸到一点线索了。在英文论坛上用"fedora can not detect nvme"搜索了一番，发现有很多类似的案例。论坛上给出的建议是，需要将BIOS里面的存储设置修由`RAID`模式修改成`AHCI`模式，就可以识别到nvme接口的SSD磁盘了。

重启电脑进入BIOS设置界面，找到`PCH存储设置`选项，发现该项的值确实是`RAID`，修改成`AHCI`之后保存BIOS设置重新进入fedora，执行`fdisk -l`果然正确识别到nvme磁盘。这时候就不需要手动修改Grub配置了，执行重新执行`sudo grub2-mkconfig -o /boot/grub2/grub.cfg`命令，Windows系统的启动项就成功添加到Grub菜单里面了。

比较蛋疼的是，在`AHCI`模式下Grub虽然识别到Windows启动盘，但是通过该模式进入win10，系统会报错`INACCESSIBLE_BOOT_DEVICE`。此时有点矛盾，`AHCI`模式能识别Windows所在磁盘但是启动不了Windows系统；`RAID`模式能进入Windows系统但是在Linux下没法识别，一旦Grub需要更新windwos启动盘将再次识别不到。

临时解决方案是，每次需要更新Grub(比如Linux内核更新会自动更新Grub)前修改回`AHCI`，让Grub能成功添加Windows的启动项，Grub更新成功之后再将`PCH存储设置`修改回`RAID`，以便能成功进入Windows系统。

## 终极方案

临时解决方案虽然勉强能用，但是过程过于繁琐，终究不是长久之计。必须彻底找到问题关键，彻底解决才是上上策。于是，我们继续在网上搜索解决方案。经过网上的信息整理和自我推断，大概猜测出问题关键所在。

回想了一下，前几天在Windows环境下更新BOIS固件和Intel快速存储技术，导致Windows系统下的磁盘模式被设置成`RAID`，BIOS设置也被修改成了`RAID`。即使将BOIS设置修改回`ACHI`模式，由于不匹配Windows系统的磁盘模式，也终将启动不了Windows内核。Linux内核在很久之前就已经有nvme驱动和RAID模块，之所以没法识别到RAID模式下的nvme磁盘，是因为安装Intel快速存储技术之后，单个nvme磁盘被设置成了`RAID0`，但实际未组建RAID。那么，我们只需要将Windows系统的磁盘模式改回系统自带的`ACHI`，就能解决问题：

- BIOS的`PCH存储设置`修改成`RAID`模式，以便能进入Windows系统

- 卸载之前安装的`Intel快速存储技术`软件

- 打开`运行`(Win键+R键)，输入"msconfig"并回车，进入"系统配置"

- 选择"引导"选项卡，此时的引导选项是全空的。勾选"安全引导"并选择"最小"，点击确定之后重启电脑

- 进入BIOS界面，将`PCH存储设置`由`RAID`修改成`AHCI`

- 由于重启前我们勾选了"安全引导"，此时会进入Windows系统的"安全模式"。继续重复前面的操作，打开"系统配置"的引导选项卡，取消"安全引导"(其实就是恢复了之前的设置)，点击确定之后重启电脑

- 第二次重启电脑后再次进入Windows，系统会自动将磁盘模式更新为`AHCI`模式。

自此，我们就成功将Windows系统的磁盘模式修改成`AHCI`模式了。提醒一句，"Intel快速存储技术"是真的没什么卵用，没必要安装。

---
参考:

[How to boot to nvme and install grub to external drive?](https://ask.fedoraproject.org/t/how-to-boot-to-nvme-and-install-grub-to-external-drive/12835)

[检测不到NVMe固态硬盘的解决方法](https://www.eassos.cn/knowledge/nvme-ssd.php)
