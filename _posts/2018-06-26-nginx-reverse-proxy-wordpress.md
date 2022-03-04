---
layout:     post
title:      "使用nginx反向代理wordpress"
date:       2018-06-26 21:30:00 +0800
category:   "nginx"
tags:       ["nginx", "wordpress", "reverse-proxy"]
excerpt:    "去年定制开发wordpress时，部署的时候碰到了一些比较大的麻烦，拖到现在分享下自己的解决方案，希望对大家有用。"
---

去年定制开发wordpress时，部署的时候碰到了一些比较大的麻烦，拖到现在分享下自己的解决方案，希望对大家有用。

## nginx的rewrite

实际需求中，我们需要将wordpress的URI前加上前缀，然后我想到了`rewrite`指令(Nginx通过`ngx_http_rewrite_module`模块来支持url重写)。

````nginx
server {
    listen 80;
    server_name example.com;

    location /cms/ {
        rewrite ^ /api_v1;
    }

    location /api/ {
        rewrite ^ http://api_v2;
    }
}
````

上面是一个"将请前端请求反向代理到后端服务器"的例子，当我们向服务器发送一个http协议的POST请求时，服务器的api_v2接口接收到的一个丢失了body的GET请求，而api_v1接口能接收到正常的POST请求。

原因是，当`rewrite`第二个参数是"http"开头，将会直接重定向(redirect)，给客户端返回临时重定向302，这时客户端会收到302后对原地址发起一个**GET**请求，所以之前**POST**请求的数据就丢失了。

这种情况可以去掉第二个参数关于协议的部分，让nginx内部跳转，只重写URI；或者使用下面讲到的`proxy_pass`。

## nginx的proxy_pass规则

一个域名下如果有两个服务，一般是在每个服务url加上前缀，然后通过nginx反向代理到对应的服务：
因为是一个域名下有两个服务，所以给每个服务建立一个vhost配置，分别监听不同的端口。然后建立一个与域名相关的vhost，专门用来监听80和443端口，然后根据传入的URI将不同的请求反向代理到对应的服务。

其实完全可以不用`rewrite`指令，就将多个服务URI加上前缀：

````nginx
upstream service_1 {
    http://localhost:port_1;
}
upstream service_2 {
    http://localhost:port_2;
}

server {
    listen      80;
    listen      [::]:80 default ipv6only=on;
    listen      443 ssl;
    listen      [::]:443 ssl default ipv6only=on;
    server_name example.com;

    location /cms/ {
        proxy_set_header            X-Real-IP           $remote_addr;
        proxy_set_header            X-Forwarded-For     $proxy_add_x_forwarded_for;
        proxy_set_header            X-Forwarded-Proto   $scheme;
        proxy_set_header            Host                $http_host;
        proxy_set_header            X-NginX-Proxy       true;
        proxy_pass                  http://service_1/;  # proxy_pass后有指定URI(就是"/")
        proxy_redirect              default;
        proxy_connect_timeout       60s;
        proxy_read_timeout          600s;
        proxy_send_timeout          600s;
        client_max_body_size        50m;
        client_body_buffer_size     256k;
        proxy_buffer_size           256k;
        proxy_buffers 4             256k;
        proxy_busy_buffers_size     256k;
        proxy_temp_file_write_size  256k;
        proxy_max_temp_file_size    128m;
    }

    location /api/ {
        proxy_set_header            X-Real-IP           $remote_addr;
        proxy_set_header            X-Forwarded-For     $proxy_add_x_forwarded_for;
        proxy_set_header            X-Forwarded-Proto   $scheme;
        proxy_set_header            Host                $http_host;
        proxy_set_header            X-NginX-Proxy       true;
        proxy_pass                  http://service_2/;  # proxy_pass后有指定URI(就是"/")
        proxy_redirect              default;
        proxy_connect_timeout       60s;
        proxy_read_timeout          600s;
        proxy_send_timeout          600s;
        client_max_body_size        50m;
        client_body_buffer_size     256k;
        proxy_buffer_size           256k;
        proxy_buffers 4             256k;
        proxy_busy_buffers_size     256k;
        proxy_temp_file_write_size  256k;
        proxy_max_temp_file_size    128m;
    }
}
````

`proxy_pass`指令的规则如下：

- 如果`proxy_pass`使用了URI，当请求传送到后端服务器时，请求的原始路径与配置中路径的匹配部分，将被替换为指令指定义的URI。

````nginx
location /api/ {
    proxy_pass                  http://service_2/test/;
}

##  "/api/a/" => "/test/a/"
````

- 如果`proxy_pass`没有使用URI，传送到后端服务器的请求一般来说就是原始URI，如果nginx修改了请求URI(比如使用`rewrite`指令)，则传送的URI是nginx修改后完整的规范化URI。

````nginx
location /api/ {
    proxy_pass                  http://service_2;
}

##  "/api/a/" => "/api/a/"
````

> 使用正则表达式定义路径，会导致无法确定请求URI中应该被替换的部分。这种情况下，`proxy_pass`指令不应该使用URI。

> 在需要代理的路径中，使用`rewrite`指令修改了URI，但仍使用相同配置处理请求(break)。这种情况下，`proxy_pass`指令设置的URI会被忽略，修改后的URI将被发送给后端服务器。

````nginx
location /api/ {
    rewrite    /api/([^/]+) /users?api=$1 break;
    proxy_pass http://127.0.0.1;
}
````

## nginx的https配置

创建`/etc/nginx/conf.d/example.conf`文件，编辑配置：

````nginx
server {
    # 同时监听80和443端口
    listen      80;
    listen      443  ssl;       # 等同于"ssl on"配置
    server_name example.com;

    ssl_certificate             "/etc/pki/nginx/server.crt";            # 证书
    ssl_certificate_key         "/etc/pki/nginx/private/server.key";    # 私钥
    ssl_protocols               TLSv1 TLSv1.1 TLSv1.2;                  # 支持协议
    ssl_session_timeout         5m;
    ssl_ciphers                 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4:!DH:!DHE';
    ssl_prefer_server_ciphers   on;

    location / {
        root    /var/html/;
        index   index.html index.htm;
    }
}
````

## nginx的ipv6监听

如果需要服务器能监听ipv6地址上的端口，只需要稍微修改即可：

````nginx
server {
    # 同时监听tcp端口和tcp6端口
    listen      80;
    listen      [::]:80 default ipv6only=on;
    listen      443 ssl;
    listen      [::]:443 ssl default ipv6only=on;
    server_name  example.com;
}
````

## ssl证书链不完整

[HTTPS](https://zh.wikipedia.org/wiki/HTTPS)是使用`HTTP`进行通信，利用`SSL/TLS`来加密数据包。主要目的是，提供网站服务器的身份验证，保护交换数据的隐私与完整性。HTTPS的信任是基于对预先安装在浏览器中的证书颁发机构的。

最近在测试网站https兼容性的时候发现，在PC和IOS的浏览器上网站https连接可被信任，在部分安卓版本的浏览器中会弹出"未被信任的连接"。首先，我们来分析一下：

- 在PC和IOS上能正常被信任，说明部署在服务器上的私钥和证书应该是没问题的。

- 网站的证书是由`GeoTrust SSL CA`机构颁发，不是自己签发的证书，不可能是根证书的问题

- 在[MySSL](https://myssl.com/)网站上检测，得出报告是"**ssl证书链不完整**"

 那`ssl证书链不完整`是怎么回事呢？因为CA证书分为两类: 根证书(Root CA)和中间证书(Intermediate CA)。根证书是几个指定证书颁发机构签发的证书；中间证书是根证书机构或者上一级中间证书机构授权，向下级签发的证书。我们可以双击网站的证书文件，可以在"证书路径"中看到：

 ````shell
 GeoTrust Global CA                             => 根证书机构
 |______GeoTrust SSL CA - G3                    => 中间证书机构
        |_______*.example.com                   => 自己网站
 ````

 很显然，我们网站的证书是由`GeoTrust SSL CA - G3`这个中间证书机构签发的，在部分安卓机型中并没安装该机构的证书，导致无法信任该中间证书机构，从而无法确定SSL证书的真正颁发者。我们可以通过工具查看网站https信息：

 ````shell
 $ openssl s_client -connect www.example.com:443

    ---
    Certificate chain
    0   s:/C=CN/ST= 中间省略 /CN=*.example.com
        i:/C=US/O=GeoTrust Inc./CN=GeoTrust SSL CA - G3
    ---
 ````

证书链中，0、1、2是证书链中每一级证书的序号，序号0对应的是被验证的网站所用证书。`s:`表示该证书，`i:`表示由哪个机构签发。在打印出的证书链信息中，我们可以看到证书链长度是1，下一级应该是验证`GeoTrust SSL CA - G3`的证书，但是由于不被浏览器信任，导致整个认证过程中断。

了解原理之后，要解决`ssl证书链不完整`的问题就相对简单的多了。我们只需要将不被浏览器信任的证书添加到Nginx服务器的证书链配置中(其他服务器同理)，不需要修改Nginx配置，只需要修改网站对应证书文件。在向证书颁发机构申请证书时，颁发机构一般会提供从根证书到网站证书的每一级证书，我们将缺少的证书链式写入证书文件即可:

````shell
cat example.cer >> server.crt
cat intermediate_1.cer >> server.crt
...
cat intermediate_n.cer >> server.crt
nginx -s reload
````

重启nginx服务器，使用问题手机访问网站，问题解决。使用`openssl s_client -connect www.example.com:443`查看网站https信息，证书链也完整了。

> 还有一个办法是在nginx配置文件中添加`ssl_client_certificate`:

````nginx
server {
    listen      443  ssl;
    server_name example.com;

    ssl_certificate             "/etc/pki/nginx/server.crt";                # 证书
    ssl_certificate_key         "/etc/pki/nginx/private/server.key";        # 私钥
    ssl_client_certificate      "/etc/pki/nginx/private/intermediate_1.cer" # 中级证书
}
````

## 无法加载js等静态资源

一般来说，配置wordpress只需要在nginx中匹配php文件和一些静态资源即可：

````nginx
server {
    listen              8080;
    server_name         localhost;
    root                /your_wp_path/;
    index               index.php;

    location / {
        try_files       $uri $uri/      /index.php?$args;
    }

    # 匹配php文件
    location ~ \.php$ {
        fastcgi_pass            127.0.0.1:9000;
        fastcgi_index           index.php;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        fastcgi_param           SCRIPT_FILENAME         $document_root$fastcgi_script_name;
        fastcgi_param           https                   off;
        include                 fastcgi_params;
    }

    # 匹配静态资源
    location ~* \.(gif|jpg|jpeg|png|ico|wmv|3gp|avi|mpg|mpeg|mp4|flv|mp3|mid|js|css|wml|swf)$ {
        expires         max;
        log_not_found   off;
    }
}
````

如果我们反向代理后，修改了原本wordpress应用的URI，比如在加了一个前缀`/cms/`。我们通过`*.php`形式请求一个页面，根据上面配置的nginx配置，php-fpm会在对应的目录下找到对应php文件并执行，然后返回结果。如果返回结果中包含地址(静态资源的地址、文章链接等)，会发现地址还是原样，只需要将数据库`wp_options`表中`siteurl`和`home`修改为对应的url前缀，或者修改admin后台的`WordPress地址`和`站点地址`，例如`https://example.com/cms`。

如果nginx只配置了https的443端口，访问的时候会发现页面样式丢失，打开浏览器控制台会发现很多`js/css`资源无法访问。这是因为wordpress在生成html页面的时候`js/css`等资源的地址是http协议，而服务器并没有对外开放80端口。我们可以在nginx中配置80端口反向代理到wordpress，但是这样浏览器页面是https和http的混合内容，相对不太安全。其实我们只需要将资源地址修改为协议无关即可，当加载的是https页面时请求https请求，当加载的是http页面时请求http请求。

我们可以在wordpress的插件或者主题中，通过过滤器机制，修改js和css资源的地址：

````php
// 将脚本类资源地址中的http://和https://，替换为/
function agnostic_script_loader_src($src, $handle) {
    return preg_replace('/^(http|https):/', '', $src);
}
add_filter('script_loader_src', 'agnostic_script_loader_src', 20,2);

// 将样式类资源地址中的http://和https://，替换为/
function agnostic_style_loader_src($src, $handle) {
    return preg_replace('/^(http|https):/', '', $src);
}
add_filter('style_loader_src', 'agnostic_style_loader_src', 20,2);
````

## wordpress的https支持

在配置完nginx配置后，发现wordpress首页可以访问，但是admin后台等其他页面会多次重定向，无法正确访问。

先确认nginx的proxy_pass设置：

````nginx
location /cms/ {
    # 向后端服务传递真实IP地址
    proxy_set_header        X-Real-IP               $remote_addr;
    # 将header原样传递到后端服务
    proxy_set_header        X-Forwarded-For         $proxy_add_x_forwarded_for;
    # 向后端服务传递真实host地址
    proxy_set_header        Host                    $http_host;
    # 向后端服务传递请求协议类型
    proxy_set_header        X-Forwarded-Proto       $scheme;
    proxy_pass              http://wordpress_service/;
    proxy_redirect          default;
}
````

然后修改wordpress的`wp-config`配置文件：

````php
// 根据$_SERVER['HTTP_X_FORWARDED_PROTO']判断反向代理过来的是否为https请求
if ($_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https') {
    $_SERVER['HTTPS']='on';                                         // 表示当前访问为https
    $_SERVER['REQUEST_URI'] = "/cms".$_SERVER['REQUEST_URI'];       // 如果反向代理修改了URI，需要将全局变量_SERVER中的REQUEST_URI修改为对应的值，否则会一直重定向错误
}

// 判断是否访问请求经过代理
if (isset($_SERVER['HTTP_X_FORWARDED_HOST'])) {
    $_SERVER['HTTP_HOST'] = $_SERVER['HTTP_X_FORWARDED_HOST'];      // 如果经过代理，需要修改主机地址
}

## 推荐登录和访问后台强制使用https
define('FORCE_SSL_LOGIN', true);
define('FORCE_SSL_ADMIN', true);
````

## wordpress图片裁剪

一般来说，通过wordpress上传的图片，除了原图(Full)，还会被裁剪成大图(Large)、中等图(Medium)、小图(Small)等规格，各个规格的具体大小取决于后台配置。如果上传之后没有生成对应的裁剪图片，一般来说是缺少php-gd库，安装对应版本的php-gd即可解决：

````shell
yum install php-gd
```

在`php.ini`配置中添加一项，开启php-gd扩展：

```
[php-gd]
extension = gd.so
````

## 文件上传限制

默认wordpress上传文件限制为2M，如果上传较大的文件，就会报错。我们需要将php和nginx的配置修改，来调整上传文件限制。

先修改php配置，编辑`/etc/php.ini`，将下面参数修改成自己需要的值：

````ini
post_max_size = 100M        # post请求大小限制
upload_max_filesize = 50M   # 文件上传大小限制
````

然后修改nginx配置，如果做了反向代理的，最好修改前端服务的配置:

````nginx
server {
    listen 80;
    ...

    location / {
        ...
        proxy_pass http://service_api;
        client_max_body_size    50M;    # 请求body的最大值
        client_body_buffer_size 256k;   # 请求缓存区大小
        ...
    }
}
````
