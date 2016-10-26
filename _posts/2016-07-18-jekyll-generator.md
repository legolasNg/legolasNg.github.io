---
layout:   post
title:    自定义Jekyll博客
date:     2016-07-18 01:08:00 +0800
category: jekyll
tags:     [ 'gh-pages', 'jekyll']
---

[ *Jekyll* ](http://jekyllcn.com/) 是一个简单的博客形态的 *静态站点* 生成器。
它有一个模版目录，其中包含原始文本格式的文档，通过`Markdown`（或者`Textile`） 以及`Liquid`转化成一个完整的可发布的静态网站，你可以发布在任何你喜爱的服务器上。

## Jekyll简介

`Jekyll`特点:

 - 简单，无数据库、无评论功能、无需更新，专注与博客内容
 - 静态，`Markdown`(或`Textile`)、`Liquid`和`HTML`&`CSS`构建可发布的静态网站
 - 博客支持，支持自定义地址、博客分类、页面、文章以及自定义的布局设计
 - `GitHub Page`基于`Jekyll`构建，免费使用`GitHub`的服务来发布博客站点、自定义域名

## Jekyll目录结构

`Jekyll`核心其实是一个文本转换引擎。概念:用你喜欢的标记语言(`Markdown`、`Textile`或者简单`HTML`)来写文章，然后 **Jekyll** 会帮你套入一个或一系列的布局中。在整个过程中你可以设置URL路径，文本在布局中的显示样式等等。这些都可以通过纯文本编辑来实现，最终生成的静态页面就是你的成品。

一个基本的`Jekyll`网站的目录结构一般是像这样的:

```
.
├── _config.yml
├── _drafts
|   ├── begin-with-the-crazy-ideas.textile
|   └── on-simplicity-in-technology.markdown
├── _includes
|   ├── footer.html
|   └── header.html
├── _layouts
|   ├── default.html
|   └── post.html
├── _posts
|   ├── 2007-10-29-why-every-programmer-should-play-nethack.textile
|   └── 2009-04-26-barcamp-boston-4-roundup.textile
├── _site
├── .jekyll-metadata
└── index.html
```
更多文档，可以访问Jekyll中文官网[jekyllcn.com/docs/home](http://jekyllcn.com/docs/home/)。
