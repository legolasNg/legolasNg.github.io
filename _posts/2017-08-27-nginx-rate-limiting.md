---
layout:     post
title:      "[译] Nginx如何做流量控制"
date:       2017-08-27 17:21:00 +0800
category:   "nginx"
tags:       ["nginx", "rate-limiting"]
excerpt:    "**流量限制**(rate-limiting)，是Nginx中一个非常实用，却经常被错误理解和错误配置的功能。我们可以用来限制用户在给定时间内HTTP请求的数量。请求，可以是一个简单网站首页的GET请求，也可以是登录表单的POST请求。"
---

2017/06/18

> 半夜醒了，看了篇关于“Nginx流量控制”的文章，之前工作的时候有粗浅地研究过，觉得这篇内容很翔实，所以想翻译分享出来。

2017/08/27

> 这篇翻译搁了都整个两个月了，闲了一阵子，现在才勉强静下心来做点正事。往后收收心，准备好好研究下Nginx和OpenResty。

***

**流量限制**(rate-limiting)，是Nginx中一个非常实用，却经常被错误理解和错误配置的功能。我们可以用来限制用户在给定时间内HTTP请求的数量。请求，可以是一个简单网站首页的GET请求，也可以是登录表单的POST请求。

流量限制可以用作安全目的，比如可以减慢暴力密码破解的速率。通过将传入请求的速率限制为真实用户的典型值，并标识目标URL地址(通过日志)，还可以用来抵御DDOS攻击。更常见的情况，该功能被用来保护上游应用服务器不被同时太多用户请求所压垮。

本篇文章将会介绍Nginx的 **流量限制** 的基础知识和高级配置，"流量限制"在Nginx Plus中也适用。

## Nginx如何限流

Nginx的"流量限制"使用漏桶算法(*leaky bucket algorithm*)，该算法在通讯和分组交换计算机网络中广泛使用，用以处理带宽有限时的突发情况。就好比，一个桶口在倒水，桶底在漏水的水桶。如果桶口倒水的速率大于桶底的漏水速率，桶里面的水将会溢出；同样，在请求处理方面，水代表来自客户端的请求，水桶代表根据"先进先出调度算法"(FIFO)等待被处理的请求队列，桶底漏出的水代表离开缓冲区被服务器处理的请求，桶口溢出的水代表被丢弃和不被处理的请求。

## 配置基本的限流

"流量限制"配置两个主要的指令，`limit_req_zone`和`limit_req`，如下所示：

```
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
	location /login/ {
		limit_req zone=mylimit;

		proxy_pass http://my_upstream;
	}
}
```

[`limit_req_zone`](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req_zone)指令定义了流量限制相关的参数，而[`limit_req`](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req)指令在出现的上下文中启用流量限制(示例中，对于"/login/"的所有请求)。

`limit_req_zone`指令通常在HTTP块中定义，使其可在多个上下文中使用，它需要以下三个参数：

 - **Key** - 定义应用限制的请求特性。示例中的Nginx变量`$binary_remote_addr`，保存客户端IP地址的二进制形式。这意味着，我们可以将每个不同的IP地址限制到，通过第三个参数设置的请求速率。(使用该变量是因为比字符串形式的客户端IP地址`$remote_addr`，占用更少的空间)

 - **Zone** - 定义用于存储每个IP地址状态以及被限制请求URL访问频率的共享内存区域。保存在内存共享区域的信息，意味着可以在Nginx的worker进程之间共享。定义分为两个部分：通过`zone=keyword`标识区域的名字，以及冒号后面跟区域大小。16000个IP地址的状态信息，大约需要1MB，所以示例中区域可以存储160000个IP地址。

 - **Rate** - 定义最大请求速率。在示例中，速率不能超过每秒10个请求。Nginx实际上以毫秒的粒度来跟踪请求，所以速率限制相当于每100毫秒1个请求。因为不允许"突发情况"(见下一章节)，这意味着在前一个请求100毫秒内到达的请求将被拒绝。

> 当Nginx需要添加新条目时存储空间不足，将会删除旧条目。如果释放的空间仍不够容纳新记录，Nginx将会返回 **503状态码**(Service Temporarily Unavailable)。另外，为了防止内存被耗尽，Nginx每次创建新条目时，最多删除两条60秒内未使用的条目。

`limit_req_zone`指令设置流量限制和共享内存区域的参数，但实际上并不限制请求速率。所以需要通过添加`limit_req`指令，将流量限制应用在特定的`location`或者`server`块。在上面示例中，我们对`/login/`请求进行流量限制。

现在每个IP地址被限制为每秒只能请求10次`/login/`，更准确地说，在前一个请求的100毫秒内不能请求该URL。

## 处理突发

如果我们在100毫秒内接收到2个请求，怎么办？对于第二个请求，Nginx将给客户端返回状态码503。这可能并不是我们想要的结果，因为应用本质上趋向于突发性。相反地，我们希望缓冲任何超额的请求，然后及时地处理它们。我们更新下配置，在`limit_req`中使用`burst`参数：

```
location /login/ {
	limit_req zone=mylimit burst=20;
	proxy_pass http://my_upstream;
}
```

`burst`参数定义了超出zone指定速率的情况下(示例中的`mylimit`区域，速率限制在每秒10个请求，或每100毫秒一个请求)，客户端还能发起多少请求。上一个请求100毫秒内到达的请求将会被放入队列，我们将队列大小设置为20。这意味着，如果从一个给定IP地址发送21个请求，Nginx会立即将第一个请求发送到上游服务器群，然后将余下20个请求放在队列中。然后每100毫秒转发一个排队的请求，只有当传入请求使队列中排队的请求数超过20时，Nginx才会向客户端返回503。

## 无延迟的排队

配置`burst`参数将会使通讯更流畅，但是可能会不太实用，因为该配置会使站点看起来很慢。在上面的示例中，队列中的第20个包需要等待2秒才能被转发，此时返回给客户端的响应可能不再有用。要解决这个情况，可以在`burst`参数后添加`nodelay`参数：

```
location /login/ {
	limit_req zone=mylimit burst=20 nodelay;

	proxy_pass http://my_upstream;
}
```

使用`nodelay`参数，Nginx仍将根据`burst`参数分配队列中的转发，并应用已配置的速率限制，但是队列中等待转发的请求会被清理。

**注意：** 对于大部分部署，我们建议使用`burst`和`nodelay`参数来配置`limit_req`指令。

## 高级配置示例

通过将基本的“流量限制”与其他Nginx功能配合使用，我们可以实现更细粒度的流量限制。

### 白名单

下面这个例子将展示，如何对任何不在白名单内的请求强制执行“流量限制”：

```
geo $limit {
	default 		1;
	10.0.0.0/8 		0;
	192.168.0.0/64 	0;
}

map $limit $limit_key {
	0 "";
	1 $binary_remote_addr;
}

limit_req_zone $limit_key zone=req_zone:10m rate=5r/s;

server {
	location / {
		limit_req zone=req_zone burst=10 nodelay;

		# ...
	}
}
```

这个例子同时使用了[`geo`](http://nginx.org/en/docs/http/ngx_http_geo_module.html#geo)和[`map`](http://nginx.org/en/docs/http/ngx_http_map_module.html#map)指令。`geo`块将给在白名单中的IP地址对应的`$limit`变量分配一个值0，给其它不在白名单中的分配一个值1。然后我们使用一个映射将这些值转为key，如下：

 - 如果`$limit`变量的值是0，`$limit_key`变量将被赋值为空字符串
 - 如果`$limit`变量的值是1，`$limit_key`变量将被赋值为客户端二进制形式的IP地址

两个指令配合使用，白名单内IP地址的`$limit_key`变量被赋值为空字符串，不在白名单内的被赋值为客户端的IP地址。当`limit_req_zone`后的第一个参数是空字符串时，不会应用“流量限制”，所以白名单内的IP地址(10.0.0.0/8和192.168.0.0/24 网段内)不会被限制。其它所有IP地址都会被限制到每秒5个请求。

`limit_req`指令将限制应用到**/**的location块，允许在配置的限制上最多超过10个数据包的突发，并且不会延迟转发。

### location包含多`limit_req`指令

我们可以在一个location块中配置多个`limit_req`指令。符合给定请求的所有限制都被应用时，意味着将采用最严格的那个限制。例如，多个指令都制定了延迟，将采用最长的那个延迟。同样，请求受部分指令影响被拒绝，即使其他指令允许通过也无济于事。

扩展前面将“流量限制”应用到白名单内IP地址的例子：

```
http {
	# ...

	limit_req_zone $limit_key zone=req_zone:10m rate=5r/s;
	limit_req_zone $binary_remote_addr zone=req_zone_wl:10m rate=15r/s;

	server {
		# ...
		location / {
			limit_req zone=req_zone burst=10 nodelay;
			limit_req zone=req_zone_wl burst=20 nodelay;
			# ...
		}
	}
}
```

白名单内的IP地址不会匹配到第一个“流量限制”，而是会匹配到第二个`req_zone_wl`，并且被限制到每秒15个请求。不在白名单内的IP地址两个限制能匹配到，所以应用限制更强的那个：每秒5个请求。

## 配置相关功能

### 日志记录

默认情况下，Nginx会在日志中记录由于流量限制而延迟或丢弃的请求，如下所示：

```
2015/06/13 04:20:00 [error] 120315#0: *32086 limiting requests, excess: 1.000 by zone "mylimit", client: 192.168.1.2, server: nginx.com, request: "GET / HTTP/1.0", host: "nginx.com"
```

日志条目中包含的字段：

 - *limiting requests* - 表明日志条目记录的是被“流量限制”请求
 - *excess* - 每毫秒超过对应“流量限制”配置的请求数量
 - *zone* - 定义实施“流量限制”的区域
 - *client* - 发起请求的客户端IP地址
 - *server* - 服务器IP地址或主机名
 - *request* - 客户端发起的实际HTTP请求
 - *host* - HTTP报头中host的值

默认情况下，Nginx以`error`级别来记录被拒绝的请求，如上面示例中的`[error]`所示(Ngin以较低级别记录延时请求，一般是`info`级别)。如要更改Nginx的日志记录级别，需要使用[`limit_req_log_level`](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req_log_level)指令。这里，我们将被拒绝请求的日志记录级别设置为`warn`：

```
location /login/ {
	limit_req zone=mylimit burst=20 nodelay;
	limit_req_log_level warn;
	
	proxy_pass http://my_upstream;
} 
```

### 发送到客户端的错误代码

一般情况下，客户端超过配置的流量限制时，Nginx响应状态码为**503(Service Temporarily Unavailable)**。可以使用[`limit_req_status`](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req_status)指令来设置为其它状态码(例如下面的**444**状态码):

```
location /login/ {
	limit_req zone=mylimit burst=20 nodelay;
	limit_req_status 444;
}
```

### 指定`location`拒绝所有请求

如果你想拒绝某个指定URL地址的所有请求，而不是仅仅对其限速，只需要在[`location`](http://nginx.org/en/docs/http/ngx_http_core_module.html#location)块中配置[`deny`](http://nginx.org/en/docs/http/ngx_http_access_module.html#deny) **all**指令：

```
location /foo.php {
	deny all;
}
``` 

## 总结

前文已经涵盖了Nginx和Nginx Plus提供的“流量限制”的很多功能，包括为HTTP请求的不同loation设置请求速率，给“流量限制”配置`burst`和`nodelay`参数。还涵盖了针对客户端IP地址的白名单和黑名单应用不同“流量限制”的高级配置，阐述了如何去日志记录被拒绝和延时的请求。

----
来源:

[Rate Limiting with NGINX and NGINX Plus](https://www.nginx.com/blog/rate-limiting-nginx/)