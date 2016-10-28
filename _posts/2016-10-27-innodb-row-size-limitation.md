---
layout:     post
title:      "innodb行的大小限制"
date:       2016-10-27 16:15:00 +0800
category:   mysql
tags:       ["innodb", "row-size-limit"]
---

最近服务器偶尔会出现数据存储失败，出现问题的服务器看似随机，但是却都有些相同点:

- 运行了一段时间的服务，而不是新搭建的服务
- 部分用户会出现该问题，尤其是数据量较大的

在查看了mysql的`error.log`文件和服务器脚本日志之后，发现出现问题的服务器在出错时都会报下面的错误：

````
ERROR 1118 (42000): Row size too large (> 8126). Changing some columns to TEXT or BLOB or using ROW_FORMAT=DYNAMIC or ROW_FORMAT=COMPRESSED may help. In current row format, BLOB prefix of 768 bytes is stored inline.
````

````
show variables like '%innodb_file_format%';
show table status;
````

innodb引擎支持的文件格式包括Antelope(羚羊)、Barracuda(梭子鱼)

- Antelope提供Redundant（冗长）、Compact（紧凑）文件格式
- Barracuda除此之外提供Dynamic(动态)和 Compressed(压缩)

压缩InnoDB的缓冲池的索引页
````
SET GLOBAL innodb_file_format=Barracuda;
ALTER TABLE [tableName] ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
````

每张表一个文件，不建议使用
````
innodb_file_per_table=1
innodb_file_format=Barracuda
````

----
来源:

[Innodb row size limitation](https://www.percona.com/blog/2011/04/07/innodb-row-size-limitation/)

[Blob Storage in Innodb](https://www.percona.com/blog/2010/02/09/blob-storage-in-innodb/)
