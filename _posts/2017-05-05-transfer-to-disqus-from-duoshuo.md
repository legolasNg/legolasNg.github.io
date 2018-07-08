---
layout:     post
title:      "将评论从多说迁移到disqus"
date:       2017-05-05 17:00:00 +0800
category:   "comment"
tags:       ["duoshuo", "disqus"]
excerpt:    "在搭建这个站点时候，由于考虑到国内无法访问`Disqus`，最后选择国内相对好用的`多说`。最近，由于业务调整[多说要关闭评论业务](http://dev.duoshuo.com/threads/58d1169ae293b89a20c57241)，所以无奈只能迁移到`Disqus`，被墙也没办法了。"
---

## 评论插件

**Jekyll** 是一个静态站点生成器，无数据库，所以评论只能通过借助第三方的js评论插件来实现。通过在自己站点页面嵌入插件的js代码，加载对应的评论插件之后，便可以统一管理站点的评论。这种第三方社会化评论插件选择很多，国内有"多说"、"畅言"、"友言"，国外有"Disqus"、"facebook comment"。但是，选择评论插件需要考虑很多问题：

- 站点接入是否简单易用，国内有些需要备案
- 服务是否稳定可靠，技术积累不足导致经常服务不可用，或者资金不足导致不再提供服务
- 在国内网络下是否可用，disqus和facebook comment被墙导致基本用不了

在搭建这个站点时候，由于考虑到国内无法访问"Disqus"，最后选择国内相对好用的"多说"。最近，由于业务调整[多说要关闭评论业务](http://dev.duoshuo.com/threads/58d1169ae293b89a20c57241)，所以无奈只能迁移到"Disqus"，被墙也没办法了。

## 导出多说评论

使用自己的账号登陆[多说](http://dev.duoshuo.com/)，然后访问自己的管理界面`[your_name].duoshuo.com/admin/`，依次操作`工具 => 导出数据 => 勾选"文章数据"和"评论数据" => 导出评论`。将会下载一个压缩包，里面是export.json文件，这个就是你站点的所有评论数据了。

## Disqus

1. 先注册一个disqus账号，然后在[首页](https://disqus.com/)点击右上角的"Admin"，进入管理界面。

2. 在管理界面点击右下角的"Installing Disqus"，进入安装向导界面。

3. 在安装向导界面点击左上角的"Create a Site"，添加站点信息(`Website Name`信息决定你站点指向的disqus地址`shortname.disqus.com`)。

4. 添加完站点之后，会弹出一个欢迎界面，点击"Got it. Let's get started!"，进入站点设置界面。

5. 先根据自己站点类型(jekyll还是wordpress)，设置选择Platform，disqus会给出一个嵌入评论代码的方案。

6. 点击"Configure"，可以设置站点地址和disqus插件的样式，填写完成之后点击"Complete Setup"就完成了设置。

### Jekyll中添加Disqus

在jekyll的配置文件`config.yaml`新增一项配置，用来控制模版中评论的显示

```
comments :
    short_name : test
```

在响应的页面模版中，添加代码来显示评论插件

````
\{\% if page.comments \%\}
    <div id="disqus_thread"></div>
    <script>
    /*
    这段注释的代码，可以反注释掉。disqus默认将当前页的地址设置为url，唯一标识也是当前页的地址。
    你可以根据自己的喜好来修改，如果需要从多说迁移，最好是保持唯一标识identifier一致
    var disqus_config = function () {
    this.page.url = "{{site.url}}{{page.url}}";
    this.page.identifier = "{{page.url}}";
    };
    */
    (function() { // DON'T EDIT BELOW THIS LINE
    var d = document, s = d.createElement('script');
    s.src = 'https://{{ site.comments.short_name }}.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
    })();
    </script>
    <noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
\{\% endif \%\}
````

### 多说评论转换为Disqus

上面的操作完成之后，我们在自己站点就可以看到disqus评论插件了(不过需要翻墙)。我们之前在"多说"的评论数据格式和"disqus"的评论数据格式不太一样，所以我们需要转换格式。

当然我们可以根据两个格式的差异，将数据一一对应转换为我们需要的格式，但是有人已经做了转换工具[**duoshuo-migrator**](https://github.com/JamesPan/duoshuo-migrator)，我们就不需要自己麻烦了。

```bash
# 克隆git仓库到本地
$ git clone https://github.com/JamesPan/duoshuo-migrator.git
# 安装依赖(需要先安装python和pip)
$ sudo pip install lxml
# 切换到工具目录下
$ cd duoshuo-migrator
# 将之前的export.json转换为我们需要的disqus.xml
python duoshuo-migrator.py -i ../export.json -o disqus.xml
```

登陆disqus后台，在`https://<shortname>.disqus.com/admin/discussions/import/platform/wordpress/`页面选择我们转换好的`disqus.xml`文件，然后导入。如果导入的数据比较少，我们马上就能在站点上看到导入的评论；如果导入数据比较多，disqus会在后台队列依次导入，等待一段时间即可。
