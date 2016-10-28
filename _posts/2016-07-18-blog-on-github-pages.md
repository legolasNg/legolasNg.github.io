---
layout:   post
title:    使用Github Pages搭建自己的博客
date:     2016-07-18 01:00:00 +0800
category: jekyll
tags:     ['gh-pages', 'blog']
---

我也不太清楚自己为什么想写博客，大概是为了记录自己工作中的积累和心得，亦或是为了记录自己的生活中的琐碎和随想。

我心目中的理想博客，应该是页面可定制、排版简单化、内容版本化、托管傻瓜式。之前换了好几个博客平台，总觉得用户体验不尽如人心，各个平台的功能都只是部分满足我心目中的需求。大部分博客样式都是部分定制，不能随心所欲;使用富文本编辑器的博客，排版太麻烦;博客内容可能不断变化，若不能版本控制简直是噩梦;自建站托管博客系统，或许可以克服前面这些难题，但是托管和维护又成了一个难题。`github pages`建站，可以利用`jekyll`和`liquid`生成页面，使用`markdown`完成排版，借用`git`进行版本控制，最后将网站托管交给`Github`。

## GitHub Page

### 简介

`Github Pages`是依托`Github`本身的技术服务经验开发出来的一款产品，配合Wiki、Graph、Pulse、Issue、Pull requests等功能，解决的是分布式的内容版本管理问题。用户通过git仓库创建、托管在github上的静态网站或静态博客，让用户通过该功能分享、诠释自己项目和作品。

`Github Pages`特点:

- 由Github免费托管，支持由git版本管理、Github多人协作
- 只支持静态页面
- 默认支持Jekyll生成器，允许Github站内生成或者用户上传
- 可以绑定专有域名，或者使用Github提供的子域名

当然，我们也可以使用其他静态站点生成器，例如:

- [Jekyll(ruby)](http://jekyllcn.com/)
- [Pelican(python)](http://docs.getpelican.com/)
- [Hexo(nodejs)](https://hexo.io/)
- [Octopress(基于jekyll)](http://octopress.org/s)
- [Hugo(go)](http://gohugo.org/)

由于`GitHub Page`默认只支持Jekyll，其它生成器需要在本地生成好静态页面在上传，而不能在Github站内生成。

### 创建并托管

#### 1. 创建github帐号

前往 [https://github.com/](https://github.com/) 页面创建自己帐号，如果已经注册可以跳过该步骤。

#### 2. 创建一个代码仓库

点击github页面右上角"+"，选择"new repository"来创建一个新的仓库，用于自己博客代码和内容管理。

在创建页面，将仓库名设置为`user.github.io`格式(user是你在github上的用户名)，填写其他信息，点击"create repository"来完成创建。

#### 3. 发布到github pages [2]

进入repo界面，点击右上角"Settings"，找到"GitHub Pages"设置项，点击"Automatic page generator"下方的"Launch automatic page generator"。

在出现的"New project site"页面编辑，点击页面下方的"continue to layouts"。然后从提供的几套默认模板中选择一个，点击"Publish page"生成站点。

然后我们在浏览器中输入`user.github.io`便可访问到我们刚才生成的pages站点。如果之前repo的名字不是`user.github.io`格式，或者user不是对应的你的github账户名，那站点对应的地址应该是`user.github.io/repo`(repo是你设置的代码仓库名)。

#### 4. 绑定自己特有域名

进入repo界面，点击右上角"Settings"，找到"GitHub Pages"设置项，在"Custom domain"下方的输入框中输入你的域名，点击"Save"保存。

#### 5. github pages类型和分支切换

`GitHub Pages`有两种基本类型:

1. User/Organization Pages(用户/组织站点)，对应`master`分支，对应域名是`username.github.io`或者`orgname.github.io`。

2. Project Pages(项目站点)，对应`gh-pages`分支，对应域名为`username.github.io/projectname`或者`orgname.github.io/projectname`。

将仓库克隆到本地，根据需要切换分支(默认`gh-pages`分支)

```
git clone https://github.com/username/username.github.io
cd username.github.io
git checkout -b master
#等同于
git branch master && git checkout master
```

进入repo界面，点击右上角"Settings"，找到"Branches"设置项，选择"Default branch"下方的分支，然后点击"update"按钮，完成远程Github上的分支切换。

#### 6. 更新github pages站点内容

`GitHub Page`项目有两种方式:

- 直接提交静态页面(静态页面可以由任何静态站点生成器生成，或者自己编辑)到某分支，然后push到GitHub的对应分支
- 提交`Jekyll`代码到某分支，然后push到GitHub的对应分支，GitHub会自动生成pages项目的静态页面

```
echo "My Page" > index.html
git add index.html
git commit -a -m "First pages commit"
git push origin gh-pages
```

如果想删除本地和远程的`gh-pages`分支，只保留`master`分支，从而使得域名变成`orgname.github.io`。

```
#查看分支
git branch -a
#删除远程分支
git branch -r -d origin/gh-pages
#推送空的分支到origin主机上
git push origin :gh-pages
```

## Jekyll

### 简介

[ *Jekyll* ](http://jekyllcn.com/) 是一个简单的博客形态的 *静态站点* 生成器。它有一个模版目录，其中包含原始文本格式的文档，通过`Markdown`（或者`Textile`） 以及`Liquid`转化成一个完整的可发布的静态网站，你可以发布在任何你喜爱的服务器上。

`Jekyll`特点:

 - 简单，无数据库、无评论功能、无需更新，专注与博客内容
 - 静态，`Markdown`(或`Textile`)、`Liquid`和`HTML`&`CSS`构建可发布的静态网站
 - 博客支持，支持自定义地址、博客分类、页面、文章以及自定义的布局设计
 - `GitHub Page`基于`Jekyll`构建，免费使用`GitHub`的服务来发布博客站点、自定义域名

### 目录结构

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

----

引用:

[GitHub Wikipedia](https://zh.wikipedia.org/wiki/GitHub)

[github-pages](https://github.com/blog/272-github-pages)
