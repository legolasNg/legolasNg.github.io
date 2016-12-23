---
layout:     post
title:      "crond环境变量问题"
date:       2016-12-17 00:29:00 +0800
category:   "linux"
tags:       "crond"
excerpt:    "`cron`是类UNIX系统中，用于设置周期性被执行的指令，也就是用来设置定时任务的。很多时候，我们写好了shell脚本，但是系统并没有按照我们预期去运行计划任务，但是我们手动执行却能正常运行。如果确定了计划任务表达式正确，那么基本上问题就在crontab的环境变量问题上了。"
---

`cron`是类UNIX系统中，用于设置周期性被执行的指令，也就是用来设置定时任务的。推荐一个crond的计划任务表达式网站：[crontab.guru](https://crontab.guru/)。

计划任务表达式(cron schedule expression)规则如下:

````
    .-------------------分钟(0 - 59)
    |   .---------------小时(0 - 23)
    |   |   .-----------天(1 - 31)
    |   |   |   .-------月(1 - 12)，或者使用月份缩写jan、feb、mar、apr
    |   |   |   |   .---星期(0 - 6)，星期日可以是0或7，或者使用星期缩写sun、mon、tue、wed、thu、fri、sat
    |   |   |   |   |
    *   *   *   *   *   [user-name] command
# 前5个值设置时间，可以是确切的值，也可以是特殊符号
# "*" 代表所有可能的值
# "," 代表以逗号为分隔符的列表范围
# "/" 代表以斜线指定步进的间隔频率
# "-" 代表以横杠间隔的整数范围
# 运行用户(user-name)可以不设置，默认为当前设置定时任务的用户
# 命令(command)可以是shell内置命令，也可以是其他可执行文件
````

## 命令使用

使用`crontab`命令来管理定时任务。

### crontab [-u user] file

将指定文件中的计划任务表达式添加到`cron`计划任务。可以使用`-u user`指定用户，默认为当前用户。

原理：将文件交给cron进程，创建一个该文件的副本，保存在`/var/spool/cron/`下，文件名为指定用户。

### crontab [-u user] [-l | -r | -e ]

管理计划任务，`crontab [-u user] -l`查看指定用户计划任务，`crontab [-u user] -r`删除指定用户的计划任务，`crontab [-u user] -e`编辑或者新增指定用户的计划任务。可以使用`-u user`指定用户，默认为当前用户。

还可以配合`-i`使用，在删除或者编辑前提示用户。

原理：删除/查看`/var/spool/cron/`目录下指定用户的计划任务文件；或者使用编辑器创建一个临时文件，编辑完成以后交给cron进程，将文件保存在`/var/spool/cron/`下。

当然，我们还可以在`/etc/crontab`文件后面添加计划任务，但是不太建议；尽量使用`crontab -e`来设置计划任务，因为这样会有语法检查；如果需要脚本处理某些问题，不太可能打开编辑器去添加的情况下，可以使用`crontab file`。

## crontab中的环境变量问题

很多时候，我们写好了shell脚本，但是系统并没有按照我们预期去运行计划任务，但是我们手动执行却能正常运行。如果确定了计划任务表达式正确，那么基本上问题就在crontab的环境变量问题上了。

### 验证猜想

使用`crontab -e`创建一个计划任务:

````
# 每分钟输出一次PATH环境变量到test文件中
* * * * * echo $PATH >> /root/test.txt
````

一分钟后，我们可以看到`/root/test.txt`文件中出现"/usr/bin:/bin"，也就是说在crontab运行的所有命令中，环境变量`$PATH`的值为"/usr/bin:/bin"。

`$PATH`是系统中可执行文件的搜索路径，也就是说我们可以直接执行这些目录下的可执行文件，否则我们需要使用可执行文件绝对路径来执行该可执行文件。

### 解决方案1 -- 绝对路径

将命令全部写成绝对路径形式(如果命令时shell的内置命令，不用写成绝对路径)，避免crontab执行时搜索不到。但是实际操作过于繁琐，你需要弄清楚每个命令所在的路径。

### 解决方案2 -- 添加PATH

在我们的shell脚本中，头两行指定PATH变量的值，指定shell环境。(shell和PATH，根据你的系统而定)

````
#!/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin
````

### 解决方案3 -- 修改配置

我们可以修改crontab的配置文件`/etc/crontab`，修改对应配置。

````
# 指定crontab运行的shell环境
SHELL=/bin/bash
# 指定crontab运行时的PATH变量
PATH=/sbin:/bin:/usr/sbin:/usr/bin
# 指定计划任务执行完成后，发送邮件给指定用户
MAILTO=root
````
