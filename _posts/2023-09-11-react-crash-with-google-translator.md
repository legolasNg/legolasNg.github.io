---
layout:    post
title:     "谷歌翻译导致react崩溃"
date:      2023-09-11 12:30:00 +0800
category:  "react"
tags:      ["react-crash", "google-translator"]
excerpt:   "最近在给项目做一个社区功能，其中客服功能会接收来自世界各地用户的聊天消息。我们的客服在在前不久反馈一个bug，在回复几个用户的消息后，页面会报错无法正常显示。"
---


最近在给项目做一个社区功能，其中客服功能会接收来自世界各地用户的聊天消息。我们的客服在在前不久反馈一个bug，在回复几个用户的消息后，页面会报错无法正常显示。收到来自客服同事的bug反馈后，我自查了一遍实在是没复现问题，于是让他们给我录了一段复现视频。视频内容如下：客服使用chrome浏览器访问网站，因为需要面对不同语言的用户，所以自动开启了谷歌翻译。当切换几次用户的聊天框之后，页面就会自动崩溃: `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`。

通过搜索错误提示，发现是问题来自于react更新节点时，如果源节点和将要更新的节点冲突时，会出现无法找到源节点的错误。为什么会出现这个问题呢？通过控制台查看了一下页面的html，发现谷歌翻译会将原有的文字翻译之后，使用一个标签包裹后替代。

````html
<div>
    hello world
</div>

<!-- 经过翻译后： -->
<div>
    <font style="vertical-align: inherit;">
        <font style="vertical-align: inherit;">hello world</font>
    </font>
</div>
````

继续研究这个问题，查看了一下bug出现时间前后的代码提交记录，发现最近提交代码差异:

````html
<div>
    { text_1 }
    { condition && text_2 }
</div>


<>
    { text_3 }
    { text_4 }
</>
````

通过翻阅各种技术社区的解释，了解到：如果一个标签中含有多个字符串变量，它们会在后续渲染中变成react的vdom和html中的dom。但是谷歌翻译并不会关心这些字符串节点，而是将他们全部包含在一个`<font>`标签中。于是，它们不再时多个文本节点，react和dom之间的同步流程会被破坏，导致无法找到对应的节点。


### 解决办法

想要避免这种情况，**对于多个字符串节点，将字符串内容都写成标签中的唯一的子元素**：

````html
<div>
    <span key="1">{ text_1 }<span>
    <span key="2">{ condition && text_2 }<span>
</div>


<>
    <span key="3">{ text_3 }</span>
    <span key="4">{ text_4 }</span>
</>
````


### 后话

类似地，谷歌翻译还可能导致绑定事件出现问题。除了通过代码避免这个问题，还可以通过更换浏览器来解决，比如微软的Edge翻译页面时，只会更新字符串本身，并且在上层标签中更新子属性。

---
参考:

[Fix React issues with Google Translate](https://guoyunhe.me/en/2019/06/02/fix-react-issues-with-google-translate/)