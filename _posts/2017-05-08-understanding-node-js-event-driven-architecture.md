---
layout:     post
title:      "[译] 了解Nodejs事件驱动架构"
date:       2017-05-08 20:19:00 +0800
category:   "Nodejs"
tags:       ["EventEmitter", "Nodejs"]
excerpt:    "Nodejs的大部分对象(比如HTTP requests、responses和stream)继承(implement)自`EventEmitter`模块，从而可以发布和监听事件。"
---

Nodejs的大部分对象(比如HTTP requests、responses和stream)继承(implement)自`EventEmitter`模块，从而可以发布和监听事件。

```javascript
const EventEmitter = require('events');
```

事件驱动类型最简单的形式，就是流行的Nodejs函数的回调方式，比如`fs.readFile`。在这个例子中，当Nodejs准备好调用回调函数时，事件将会被触发一次，回调作为事件处理器。我们先来探讨这种基本形式。

## Node，准备好时调用

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

这里纯粹使用Node的回调方式，callback函数的第一个参数`err`为null，并且将最后一个参数传递给host函数。你应该一直使用这样的形式，因为可能会被使用到。将回调函数作为host函数的最后一个参数，并且将可能的error对象作为回调函数的第一个参数。

### 现代JavaScript的callback替代方法

在现代JavaScript中，有promise对象，promise对象可以替代异步API的回调函数。promise对象允许我们去分开操作success和error的情况，而不是将回调函数作为参数传递给host函数并在同样的地方处理error。而且promise对象允许我们链式调用多个异步API，而不需要嵌套使用。

如果`readFileAsArray`函数支持promise，我们可以这样写代码:

```javascript
readFileAsArray('./numbers.txt')
    .then(lines => {
        const numbers = lines.map(Number);
        const oddNumber = numbers.filter(n => n%2 === 1);
        console.log('Odd numbers count:', oddNumbers.length);
    })
    .catch(console.error);
```

我们这里调用`.then`函数来获取host函数的返回值，而不是传递一个回调函数。`.then`函数通常可以让我们访问和回调函数版本相同的行数组，也可以让我们像之前那么处理它。为了处理error，我们在结果上增加一个`.catch`函数调用，允许我们在error发生时访问它。

在现代JavaScript中new一个Promise对象，可以使host函数更容易支持promise接口。除了已经支持的回调接口外，我们可以修改`readFileAsArray`函数来支持promise接口:

```javascript
const readFileAsArray = function (file, cb = () => {}) {
    return new Promise( (resolve, reject) => {
        fs.readFile(file, function (err, data) {
            if (err) {
                reject(err);
                return cb(err);
            }

            const lines = data.toString().trim().split('\n');
            resolve(lines);
            cb(null, lines);
        });
    });
};
```

为了使函数返回一个Promise对象，我们包裹`fs.readFile`异步调用。promise对象会暴露两个参数，一个resolve函数，一个reject函数。

当我们想调用带error的回调函数时，同时会使用promise的`reject`函数;当我们想调用带data的回调函数时，同时会使用`resolve`函数。在这种情况下，我们唯一需要做的是，在代码和promise接口一起使用时，给回调函数参数设置默认值。我们可以在参数中使用一个简单的默认空函数:`() => {}`。

### 用async/await消费promise

当需要循环异步函数时，增加promise接口可以使代码更容易使用。如果使用回调函数，事情可能会变得一团糟。Promise是这种情况改善了一点，函数生成器又改进了一点。异步代码更现代化的方式是，是使用`async`函数，可以允许我们像同步代码一样处理异步代码，从而使代码可读性更强。

下面是使用`async/await`来消费`readFileAsArray`函数:

```javascript
async function countOdd () {
    try {
        const lines = await readFileAsArray('./numbers.txt');
        const numbers = line.map(Number);
        const oddCount = numbers.filter(n => n%2 === 1).length;
        console.log('Odd numbers count:', oddCount);
    } catch (err) {
        console.log(err);
    }
}
```

我们先创建一个异步函数，这只是一个`async`关键字作为前缀的普通函数。在异步函数内部，使用关键字`await`，可以让调用`readFileAsArray`函数就像返回lines变量一样。可以像`readFileAsArray`函数调用是同步一样，继续执行代码。我们执行async函数来获取运行的数据，这样非常简单，而且可读性很好。如果想处理错误，我们需要将异步调用包含在`try/catch`语句中。

有了`async/await`特性，我们不需要去使用特殊的API(像`.then`和`.catch`)。我们只需要在代码中标记不同的函数，使用纯粹的JavaScript。我们可以在任何支持promise接口的函数上使用`async/await`特性，但是不能在回调风格的函数上使用(例如`setTimeout`)。

## EventEmitter模块

EventEmitter是Node中促进对象通讯的模块，也是Node异步事件驱动架构的核心。Node中很多内置模块都继承自EventEmitter。

概念很简单: emitter对象发布命名事件，导致之前注册的监听器被调用。所以一个emitter对象基本有两个特性:

- 发布命名事件
- 注册和注销监听器函数

要使用EventEmitter，我们只需要创建一个继承自EventEmitter类的子类

## Events不等于异步

## 异步Events

## Events参数和错误

## 监听器的顺序


----
来源:

[Understanding Node.js Event-Driven Architecture](https://medium.freecodecamp.com/understanding-node-js-event-driven-architecture-223292fcbc2d)
