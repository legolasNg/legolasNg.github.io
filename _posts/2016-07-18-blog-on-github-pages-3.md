---
layout:     post
title:      "使用Github Pages搭建博客(3) -- Jekyll"
date:       2016-07-18 01:00:00 +0800
category:   "blog"
tags:       ["gh-pages", "Jekyll"]
excerpt:    "Jekyll是一个简单的博客形态的静态站点生成器。它有一个模版目录，其中包含原始文本格式的文档，通过Markdown(或者Textile)以及Liquid转化成一个完整的可发布的静态网站，你可以发布在任何你喜爱的服务器上。"
---

[Jekyll](http://jekyllcn.com/) 是一个简单的博客形态的 *静态站点* 生成器。它有一个模版目录，其中包含原始文本格式的文档，通过`Markdown`（或者`Textile`） 以及`Liquid`转化成一个完整的可发布的静态网站，你可以发布在任何你喜爱的服务器上。

## Jekyll入门

### 1.简介

`Jekyll`核心其实是一个文本转换引擎。概念:用你喜欢的标记语言(`Markdown`、`Textile`或者简单`HTML`)来写文章，然后 **Jekyll** 会帮你套入一个或一系列的布局中。在整个过程中你可以设置URL路径，文本在布局中的显示样式等等。这些都可以通过纯文本编辑来实现，最终生成的静态页面就是你的成品。`Jekyll`特点:

- 简单，无数据库、无评论功能、无需更新，专注与博客内容
- 静态，`Markdown`(或`Textile`)、`Liquid`和`HTML`&`CSS`构建可发布的静态网站
- 博客支持，支持自定义地址、博客分类、页面、文章以及自定义的布局设计
- `GitHub Page`基于`Jekyll`构建，免费使用`GitHub`的服务来发布博客站点、自定义域名

### 2.安装

Jekyll是使用Ruby语言编写，安装Jekyll最好方式是使用`RubyGems`。

````bash
# 红帽系发行版下安装gem
yum install ruby rubygems ruby-devel
# debian系发行版下安装gem
apt-get install ruby rubygems ruby-dev redhat-rpm-config

# 使用gem安装jekyll
gem install jekyll
````

### 3.快速搭建

Jekyll提供命令快速创建一个站点，并生成静态页面。

````bash
# 安装依赖
gem install bundler
# 创建一个简单站点
jekyll new myblog

cd ./myblog
# 运行jekyll，生成静态页面，并监听本地端口4000
jekyll serve
````

### 4.命令基本用法

````bash
# 将项目中内容转换为静态页面，并生成到./site目录下
jekyll build
# 指定生成目录
jekyll build --destination <destination>
# 指定源目录和生成目录
jekyll build --source <source> --destination <destination>
# 检查文件修改，并自动生成
jekyll build --watch

# 启动集成的服务器，监听localhost:4000，并托管静态内容
jekyll serve
# 后台运行服务器
jekyll serve --detach
# 检查文件修改，并自动生成静态内容
jekyll serve --watch
````

很多配置选项，既可以在命令行中作为标识设定，也可以在`.config.yml`配置文件中设定。

````yaml
# _config.yml配置文件内容
source:      _source
destination: _deploy
````

等价于以下命令:

````bash
jekyll build --source _source --destination _deploy
````

### 5.目录结构

一个基本的`Jekyll`网站的目录结构一般是像这样的:

- `_config.yml`，配置文件，可以设置一些jekyll配置，或者保存一些复用的数据和变量。
- `_drafts`，未发布的文章。
- `_includes`，部分可以重用的html代码或者数据，通过标签`{ % include file.ext % }`来包含文件`_includes/file.ext`。
- `_layouts`，包裹在文章外部的模板，可以使用`{ { content } }`标签将文章内容插入页面。
- `_posts`，保存文章，文件名格式必须是`YEAR-MONTH-DAY-title.MARKUP`。
- `_data`，保存格式化的站点数据，jekyll会自动加载该目录下文件(`.yml`或`.yaml`)，可以使用标签`{ { site.data.members } }`来访问该目录下`members.yml`文件。
- `_site`，jekyll转换完成之后，生成的静态页面。
- `index.html`、其他html文件、Markdown文件，如果包含yaml头信息，这些文件将自动被转换。
- 其他例如`css`、`images`文件夹，`favicon.ico`文件等，都会被完全复制到生成的site中，可以在html中直接使用。

### 6.主题下载

[jekyllthemes](http://jekyllthemes.org/)提供了很多现成的主题，我们可以下载下来，然后稍加修改就可以作为站点主题。

## 深入定制

### 1.yaml头信息

任何包含`yaml`头信息的文件，都会被Jekyll当作特殊文件来处理。`yaml`头信息的基本格式是两行三虚线:

````yaml
---
layout: post
title: My Blog
---
````

在两行三虚线中，可以设置一些预定义的变量或者自定义变量。然后在接下来的文件、页面或者模板中，都可以通过`liquid标签`来使用这些变量。

````yaml
# 文章yaml头信息中定义的变量
{{ page.title }}

# 配置中定义的变量
{{ site.comments }}
````

#### 预定义的全局变量

在页面`yaml头信息`使用预定义的全局变量:

- `layout`，指定模版文件(不需要扩展名)，模版文件需要放在`_layouts`目录下
- `permalink`，用于指定文章的URL地址，默认值为`/year/month/day/title.html`，可以不设置
- `published`，用于设置该文章是否展示，true是展示，false是隐藏

#### 自定义变量

在文章yaml头信息中可以增加自定义变量：

- `date`，日期的具体格式为"YYYY-MM-DD HH:MM:SS +/-TTTT"，时，分，秒和时区都是可选的。会覆盖文章名字(文件名)中的日期，可以用来保证文章排序。
- `category` / `categories`，指定文章一个或多个分类属性。当站点生成后，可以根据该属性对文章进行分类。
- `tags`，指定文章一个或多个标签属性，与`category`类似。
