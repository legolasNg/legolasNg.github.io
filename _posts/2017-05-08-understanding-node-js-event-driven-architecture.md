---
layout:     post
title:      "[译] 了解Nodejs事件驱动架构"
date:       2017-05-08 20:19:00 +0800
category:   "Nodejs"
tags:       ["EventEmitter", "Nodejs"]
excerpt:    ""
---

Nodejs的大部分对象(比如HTTP requests、responses和stream)继承(implement)自`EventEmitter`模块，从而可以发布和监听事件。

```javascript
const EventEmitter = require('events');
```

事件驱动类型最简单的形式，就是流行的Nodejs函数的回调方式，比如`fs.readFile`。在这个例子中，当Nodejs准备好调用回调函数时，事件将会被触发一次，回调作为事件处理器。我们先来探讨这种基本形式。

## Call me when you're ready, Node!

在JavaScript添加promise原生支持和async/await特性前，Nodejs处理异步事件的原始方式是回调。因为function在JavaScript中是一等公民，回调一般是传递给其他函数的函数。我们需要知道，回调并不代表代码中的异步调用，因为一个函数既可以被同步调用，也可以被异步调用。

例如，有一个函数`fileSize`，它接受一个回调函数`cb`，并且可以基于一个条件来同步或异步地被调用:

```javascript
function fileSize (fileName, cb) {
    if (typeof fileName !== 'String') {
        // 同步调用cb
        return cb(new TypeError('argument should be string'));
    }
    fs.stat(fileName, (err, stats) => {
        // 异步调用cb
        if (err) { return cb(err); }
        // 异步调用
        cb(null, stats.size);
    });
}
```

请注意，这种是导致异常错误的错误示例，设计function最好始终同步或异步地使用回调。我们来探讨一个典型的异步Nodejs函数的实例，使用回调形式来书写:

```javascript
const readFileAsArray = function (file, cb) {
    fs.readFile(file, function (err, data) {
        if (err) {
            return cb(err);
        }
        const lines = data.toString().trim().split('\n');
        cb(null, lines);
    });
}
```

`readFileAsArray`接受一个文件路径和一个回调函数，该函数读取文件内容，并将其分割成行数组，并且调用携带该数组的回调函数。这里有个例子，假如我们将`numbers.txt`放在该目录下，文件内容如下:

```
10
11
12
13
14
15
```

如果我们有个统计该文件中奇数的任务，我们可以使用`readFileAsArray`函数来简化这个操作:

```javascript
readFileAsArray('./numbers.txt', (err, lines) => {
    if (err) throw err;
    const numbers = lines.map(Number);
    const oddNumber = numbers.filter(n => n%2 === 1);
    console.log('Odd numbers count:', oddNumber.length);
});
```

代码将数字内容读入一个字符串数组，然后将其解析成数字，并且统计奇数个数。


### The modern JavaScript alternative to Callbacks

### Consuming promises with async/await

## The EventEmitter Module

## Events !== Asynchrony

## Asynchronous Events

## Events Arguments and Errors

## Order of Listeners


----
来源:

[Understanding Node.js Event-Driven Architecture](https://medium.freecodecamp.com/understanding-node-js-event-driven-architecture-223292fcbc2d)
