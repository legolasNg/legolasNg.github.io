---
layout:     post
title:      "innodb行的大小限制"
date:       2016-10-27 16:15:00 +0800
category:   mysql
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
+--------+--------+---------+------------+------+----------------+-------------+-----------------+--------------+-----------+----------------+---------------------+-------------+------------+-------------------+----------+----------------+---------+
| Name   | Engine | Version | Row_format | Rows | Avg_row_length | Data_length | Max_data_length | Index_length | Data_free | Auto_increment | Create_time         | Update_time | Check_time | Collation         | Checksum | Create_options | Comment |
+--------+--------+---------+------------+------+----------------+-------------+-----------------+--------------+-----------+----------------+---------------------+-------------+------------+-------------------+----------+----------------+---------+
| t_test | InnoDB |      10 | Dynamic    |    0 |              0 |       16384 |               0 |        32768 |         0 |           NULL | 2016-12-23 21:50:01 | NULL        | NULL       | latin1_swedish_ci |     NULL |                |         |
+--------+--------+---------+------------+------+----------------+-------------+-----------------+--------------+-----------+----------------+---------------------+-------------+------------+-------------------+----------+----------------+---------+

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

innodb引擎支持的文件格式包括Antelope(羚羊)、Barracuda(梭子鱼)

- Antelope提供Redundant（冗长）、Compact（紧凑）文件格式
- Barracuda除此之外提供Dynamic(动态)和 Compressed(压缩)

在标准(Antelope)格式中，blob、text和varchar的前768字节保存在行中，其余部分保存在行外的page上。Redundant和Compact行格式的innodb引擎会尽可能地将整个数据存储在一个innodb page上，

压缩InnoDB的缓冲池的索引页

## 解决方案

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
参考:

[Innodb row size limitation](https://www.percona.com/blog/2011/04/07/innodb-row-size-limitation/)

[Blob Storage in Innodb](https://www.percona.com/blog/2010/02/09/blob-storage-in-innodb/)
