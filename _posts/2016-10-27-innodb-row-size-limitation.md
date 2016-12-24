---
layout:     post
title:      "innodb行的大小限制"
date:       2016-10-27 16:15:00 +0800
category:   "mysql"
tags:       ["innodb", "row-size-limit"]
excerpt:    "下面是线上项目中的一张主要的表`t_test`，这张表存储的字段较多，且记录条目也比较多，一些字段和索引也是经过精心测试和优化的。由于业务逻辑逐渐复杂，表中的数据也逐渐增多，所以我们将表中的三个字段声明为text类型。"
---

下面是线上项目中的一张主要的表`t_test`，这张表存储的字段较多，且记录条目也比较多，一些字段和索引也是经过精心测试和优化的。由于业务逻辑逐渐复杂，表中的数据也逐渐增多，所以我们将表中的三个字段声明为text类型。

````
CREATE TABLE IF NOT EXISTS `t_test` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    ...
    `success_content` text,
    `fail_content` text,
    ...
    `big_data` text,
    `desc` varchar(200) NOT NULL DEFAULT '',
    `lastupdate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
````

## 问题排查

某业务上线后一直运行良好，但是最近逐渐有用户反馈部分操作失败。只有少量用户遇到这个问题，也不是一定能复现，一度让我很头疼。

查看了mysql的`error.log`日志，发现有多次如下的报错；根据服务日志，在报错逻辑的代码行中打上log，记录下可能导致mysql报错的sql语句，将sql语句手动拼接之后，复制粘贴到命令行执行，发现mysql报了下面同样的错。

````
ERROR 1118 (42000): Row size too large (> 8126). Changing some columns to TEXT or BLOB or using ROW_FORMAT=DYNAMIC or ROW_FORMAT=COMPRESSED may help. In current row format, BLOB prefix of 768 bytes is stored inline.
````

经过分析和排查之后，我们基本锁定是mysql的插入导致的报错。

## 错误分析

根据报错信息，mysql提示是行的数据过大，应该将一些字段类型声明为TEXT或者BLOB，再或者将`ROW_FORMAT`(行格式)设置为DYNAMIC或者COMPRESSED。根据这个信息，我们查看一下mysql数据库的一些变量参数信息：

````
# 查看所有表的状态
show table status;
+--------+--------+---------+------------+------+----------------+-------------+
| Name   | Engine | Version | Row_format | Rows | Avg_row_length | Data_length |
+--------+--------+---------+------------+------+----------------+-------------+
| t_test | InnoDB |      10 | Dynamic    |    0 |              0 |       16384 |
+--------+--------+---------+------------+------+----------------+-------------+

# 查看当前数据库innodb引擎的文件格式
show variables like '%innodb_file_format%';
+--------------------------+-----------+
| Variable_name            | Value     |
+--------------------------+-----------+
| innodb_file_format       | Barracuda |
| innodb_file_format_check | ON        |
| innodb_file_format_max   | Barracuda |
+--------------------------+-----------+
````

mysql的innodb引擎存储blob/text类型字段的行为，取决于三个因素：字段大小、整行(row)大小、innodb行格式。

innodb引擎支持的文件格式包括`Antelope`(羚羊)、`Barracuda`(梭子鱼):

- Antelope提供Redundant（冗长）、Compact（紧凑）文件格式
- Barracuda除此之外提供Dynamic(动态)和 Compressed(压缩)

`Antelope`格式的innodb引擎会尽可能地将整行数据存储在一个innodb page上，并且一个InnoDB page存储多行数据(至少是2行)，一个innodb page大约是16k，所以行大小限制为(16k - page header- page trailer) / 2。如果行中有可变长度字段(blob/text/varchar)，并且整行大小超过行大小限制，InnoDB会将字段其余数据页外存储(off-page)。这种情况下(Redundant或Compact)，每个可变长度字段(blob/text/varchar)的前768字节存储在innodb page内的行中，其余部分存储在页外。

导致innodb的1118错误的原因：1、多个可变长度字段；2、每个字段的值超过768(不是定义的字段大小，而是字段值的大小)；3、innodb引擎不是在定义表的时候判断，而是每次插入操作的时候判断。

`Barracuda`格式的innodb引擎，当ROW_FORMAT设置为DYNAMIC只使用一个20字节的指针作为可变长度类型，并且优先选择较小的字段存储在innodb page上。并且可以给blob增加前缀索引(prefix index)，将前缀索引建立在page外的blob上而不是page内。ROW_FORMAT设置为COMPRESSED时，innodb引擎的对可变长度字段的存储策略类似，并且总是压缩不在page内的数据，即使没有设置KEY_BLOCK_SIZE，也没有启用正常数据和索引的压缩。

*innodb在存储blob时，page内部和外部的blob其实时不共享的。每个blob在页外都有16k分配，即使blob只有1个字节大小。如果每行有多个blob，可能会导致数据库效率比较低。所以最好是一行只定义一个blob来组合数据，并且压缩改数据，text类型同理*

## 解决方案1 -- Dynamic

将innodb引擎的文件格式设置为Barracuda，并且将行格式设置为DYNAMIC。

````
SET GLOBAL innodb_file_format=Barracuda;
ALTER TABLE [tableName] ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
````

## 解决方案2 -- Compressed

将innodb引擎的文件格式设置为Barracuda，将行格式设置为COMPRESSED，并且设置缓冲池索引块大小。一般压缩效果明显，压缩率在30%-40%左右，但是会影响存储效率。

````
SET GLOBAL innodb_file_format=Barracuda;
ALTER TABLE [tableName] ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8，
````

## 解决方案3 -- 单表一文件

每张表一个文件，不建议使用。对于单行多可变长度字段的表，效果可以，但是对于其他表浪费存储空间。

````
innodb_file_format=Barracuda
innodb_file_per_table=1
````

----
参考:

[Innodb row size limitation](https://www.percona.com/blog/2011/04/07/innodb-row-size-limitation/)

[Blob Storage in Innodb](https://www.percona.com/blog/2010/02/09/blob-storage-in-innodb/)
