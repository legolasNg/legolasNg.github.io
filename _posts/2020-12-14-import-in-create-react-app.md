---
layout:    post
title:     "CRA中的import"
date:      2020-14-14 00:56:00 +0800
category:  "webapck"
tags:      ["webpack", "create-react-app"]
excerpt:   "最近使用react开发一个前端项目，项目是使用`Create-React-App`创建的。前几天一个页面需要代码编辑器，在github上搜索了一番，决定使用 [React-Ace](https://github.com/securingsincity/react-ace) 。在使用过程中遇到了一些问题，记录下解决方案，希望能帮到需要的人"
---


最近使用react开发一个前端项目，项目是使用`Create-React-App`创建的。前几天一个页面需要代码编辑器，在github上搜索了一番，决定使用 [React-Ace](https://github.com/securingsincity/react-ace) 。在使用过程中遇到了一些问题，记录下解决方案，希望能帮到需要的人。


## Ace编辑器

### 简单例子

按照 [React-Ace](https://github.com/securingsincity/react-ace) 文档，我们可以很轻松的在项目中使用Ace编辑器。该编辑器可以提供代码高亮、语法提示、代码提示、自动缩进等功能，我们能很方便的开发出我们需要的编辑器。

```js
import React, {Component} from "react";
import { render } from "react-dom";
import AceEditor from "react-ace";

class AceJsonEditor extend Component {
    render {
        return (
            <AceEditor mode="json"
                       theme="github"
                       editorProps={{ $blockScrolling: true }}
                       { ...this.props }
                    />
        );
    }
}


render(AceJsonEditor, document.getElementById("root"));
```

### 出现的问题

## 解决方案

### 全部编译

### 使用外链

### 部分编译

## Webpack

### eject

### rewire

### 指定loader

---
来源:

[Ace Editor](https://github.com/securingsincity/react-ace/blob/master/docs/Ace.md)