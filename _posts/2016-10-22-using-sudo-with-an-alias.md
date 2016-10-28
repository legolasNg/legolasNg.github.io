---
layout:     post
title:      "[译] 别名和sudo一起使用"
date:       2016-10-22 00:35:00 +0800
category:   bash
tags:       ["sudo", "alias"]
---

一般来说，`sudo`会忽略通过`.bashrc`文件、`.bash_aliases`文件或者`alias`命令设置的别名命令(aliased commands)。

比如，我们经常将`ll`用作`ls -lh`命令的别名。然后，我们输入`ll`，终端将会返回一个关于当前目录的长列表。但是，当我们输入`sudo ll`时，终端将会返回:

````
$ sudo ll
=>	sudo: ll: command not found
````

## 解决方案1

我们给`shutdown`命令创建一个别名，当`rotorrent`运行的时候尝试输入这个别名去关机，我们可以看到系统不会关机。想要运行`/sbin/shutdown`需要root权限，然而`sudo`会完全忽略`shutdown`的这个别名。解决办法是，我们需要添加另一个别名:

````
$ alias sudo='sudo '
````

`sudo`后面的那个空格将会告诉`bash`，去检查跟在空格后面的命令是否也是一个别名。bash手册(通过`man bash`查看)上面是这么描述的:

> If the last character of the alias value is a blank, then the next command word following the alias is also checked for alias expansion.
> 如果别名值的最后一个字符是空格，将会检查"跟在别名后的下一个命令"是否也是别名扩展。

## 解决方案2

现在在`shutdown`的别名前加`sudo`，终于可以关机了。还有另一个解决办法(也是别名)，听说有效但没尝试过，因为上面的那个办法很实用并且我还没弄懂下面的这个原理:

````
$ alias sudo='A=`alias` sudo  '
````

我不太确定这种做法是否有点避易就难，或者可能这种办法更好、更差、亦或其他。

下面是我机器`.bash_aliases`文件中的一些别名设置(因为系统才安装，可能以后会加更多别名设置):

````
# Shortcuts
alias ll='ls -lh'
alias la='ls -lhA'
alias l='ls'
alias c='clear'
alias x='exit'
alias q='exit'

# Don't run shutdown if rtorrent is running - as long as there's a screen with "tor" in its name, shutdown won't run (unless you call /sbin/shutdown, or unalias it)
alias shutdown='/home/james/scripts/safe.shutdown.sh'

# When using sudo, use alias expansion (otherwise sudo ignores your aliases)
alias sudo='sudo '
````

----
来源:

[Using sudo with an alias](http://www.shellperson.net/using-sudo-with-an-alias/)
