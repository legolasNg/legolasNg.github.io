---
layout:     post
title:      "使用Github Pages搭建博客(4) -- Markdown"
date:       2016-07-18 01:00:00 +0800
category:   "blog"
tags:       ["gh-pages", "Markdown"]
excerpt:    "未完待续"
---

`Markdown`是轻量级标记语言，语法简单，样式漂亮。我本人非常喜欢使用`Markdown`，特别是用来记录东西、写文章，本文也是使用`Markdown`书写。

- 简单的标记语法，实现页面排版，还能支持代码块，插入图片和链接，使用键盘来搞定内容和格式，效率特别高。
- 可以导出成html和pdf格式，很方便分享。
- 可以直接在内容中插入`HTML`代码，可以实现复杂的排版。

## 与`HTML`的关系

`Markdown`的呈现其实需要markdown解释器将其解析成`HTML`，可以将`Markdown`看作是简化了标记形式的`HTML`子集。所以，`Markdown`支持`HTML`也就很容易理解了，解析后的`Markdown`文档就是纯`HTML`结构。

弄清`Markdown`和`HTML`的关系之后，我们其实可以很容易写一个简单的markdown解释器，将其解析为html文件。核心原理就是正则匹配，然后将对应标签替换为html标签。

## 语法

`Markdown`语法规则很简单，常用的标签就10来个。`Markdown`语言细节标准比较模糊，导致不同的`Markdown`语法解析器渲染的结果，可能会有部分差异；部分解析器还扩展了`Markdown`语法，使其支持更多实用的功能，这也造成了语法解析器的渲染结果有部分差异。对于不同的`Markdown`语法解析器，大部分语法还是一致，只是少量细节有点差异，不会对使用造成影响，建议使用Github风格的Markdown语法 -- `GFM`。

- [创始人John Gruber的Markdown语法说明](http://daringfireball.net/projects/markdown/syntax)
- [Markdown语法说明(简体中文版)](http://wowubuntu.com/markdown/)
- [Github的Markdown语法说明](https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown)

### 标题

`Markdown`使用`#`来定义大纲标题，有几个`#`就代表是几级标题:

```
# 一级标题(对应<h1>标签)
## 二级标题(对应<h2>标签)
...
###### 六级标题(对应<h6>标签)
```

### 强调

`Markdown`使用`*`和`_`作为标记强调文字的符号，使用标记符号将文字包围:

```
*test*  斜体(对应<em>标签)
_test_  斜体(对应<em>标签)

**test line**   粗体(对应<strong>标签)
__test line__   粗体(对应<strong>标签)
```

### 列表

`Markdown`支持有序列表和无序列表，无序列表使用`*`、`+`和`-`，有序列表使用数字后接一个英文句点:

```
* red 无序列表(对应<ul><li>...</li></ul>标签)
+ red
- red

1. red 有序列表(对应<ol><li>...</li></ol>标签)
```

如果想嵌套使用列表，只需要被嵌套的列表相对缩进一个单位。

```
- red
    - apple
    - sun
- green
```

### 图片

`Markdown`标记图片允许两种样式 -- 行内式和参考式。

行内式，以`!`开始，接着一个`[]`里面放图片的替代文字，接着一个`()`里面放图片的网址(小括号内的网址后，还可以使用引号包住加上图片title)：

```
![Alt text](/path/to/img.jpg)   行内式(对应<img>标签)
![Alt text](/path/to/img.jpg "title")   
```

参考式，以`!`开始，接着一个`[]`里面放图片的替代文字，接着一个`[]`里面放图片的参考名称；然后在另一行`[]`里面放图片的参考名称，后接一个`:`后面跟着图片的网址和标题:

```
![Alt text][id]

[id]: /path/to/img.jpg "title"  参考式(对应<img>标签)
```

`Markdown`不能指定图片的宽度和高度，以及更复杂的样式，如果需要的话，可以使用html的`<img>`标签。

### 链接

`Markdown`使用和图片很相似的语法来标记链接，允许两种样式 -- 行内式和参考式。

行内式，`[]`里面放链接描述，后接`()`里面放链接地址(小括号内的网址后，还可以使用引号包住加上链接title):

```
[This link](http://example.net/)    行内式(对应<a href="" title="">...</a>)
```

参考式，`[]`里面放链接描述，后接`[]`里面放链接的参考名称或标识；然后在另一行`[]`里面放链接的参考名称或标识，后接一个`:`后面跟着链接的地址和标题:

```
[an example][id]

[id]: http://example.com/  "title"  参考式(对应<a href="" title="">...</a>)
```

不管是链接还是图片，如果我们想使用同主机的资源，只需要将图片网址或链接地址替换为相对路径即可。

### 区块引用

`Markdown`标记区块引用`>`符号，可以在每行文字前加`>`，也可以在段落第一行前加`>`；如果想嵌套使用区块引用，可以根据层次使用不同数量的`>`:

```
> test article  区块引用(对应<blockquote>标签)

> first line
>> second line
```

### 代码

在文本中使用` ` `包裹的内容，会被识别成行内代码；使用` ``` `包裹的多行内容，会被识别成代码：

````
 `document.getElementById()`

 ```
 var a = 0;
 var b = 1;
 var c = a + b;
 ```
````
