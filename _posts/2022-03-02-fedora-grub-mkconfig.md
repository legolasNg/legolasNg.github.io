---
layout:    post
title:     "grub引导修复"
date:      2022-03-02 20:22:00 +0800
category:  "linux"
tags:      ["fedora", "grub"]
excerpt:   "昨天晚上本来想着更新一下grub主题，没成想grub主题生效之后，识别不到windows启动分区了。忙活了大半夜才找到问题，修复多系统引导。"
---


昨天晚上本来想着更新一下grub主题，没成想grub主题生效之后，识别不到windows启动分区了。忙活了大半夜才找到问题，修复多系统引导。

> `GRUB` 是linux系统下的引导加载程序，配合`os-probe`可以实现对其他linux和windows系统的识别，从而实现多系统引导。

## 尝试1 - 重新生成配置

刚开始，我以为是第三方的主题安装脚本出了问题，导致生成的grub配置出了差错。手动重新生成grub配置，发现还是没解决问题。

````bash
# 其他发行版和fedora34之前版本
sudo grub2-mkconfig -o /boot/efi/EFI/fedora/grub.cfg

# fedora34之后版本
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
````

## 尝试2 - 调整grub参数

重新检查了一下grub主题的安装脚本，发现有调整grub参数的行为。于是上wiki查阅了grub使用手册，确定了多系统识别的参数。修改`/ect/default/grub`文件:

````bash
GRUB_DISABLE_OS_PROBER=false
````

文件修改之后，再次使用`grub2-mkconfig`重新生成配置，发现还是无法识别到windows。

## 尝试3 - 手动修改配置

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

配置里面的`$hints_string`和`$fs_uuid`需要根据本机的实际情况手动指定。通过`blkid`命令确定windows系统对应的EFI分区UUID。

````
--hint-efi=nvmexxx,gpt1 xxxx-xxxx-xxxx
````

运行`blkid`命令之后发现找不到对应的硬盘分区，`fdisk -l`命令也找不到对应的磁盘。这时大概就找到问题所在了，linux系统识别不到对应的nvme磁盘。

## 找到症结

上网搜索了一下类似的案例，只需要修改BIOS里面的存储设置，将`IDE`或者`RAID`修改成`AHCI`模式，就可以识别到nvme接口的SSD磁盘了。

修改完BIOS，重新进入fedora执行`fdisk -l`，能正确识别到对应的磁盘。这时候就不需要手动修改grub配置了，执行重新执行`sudo grub2-mkconfig -o /boot/grub2/grub.cfg`命令，windows系统的启动项就添加到grub菜单里面了。