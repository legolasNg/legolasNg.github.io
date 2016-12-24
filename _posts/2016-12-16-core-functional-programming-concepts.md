---
layout:     post
title:      "[译] 函数式编程核心概念"
date:       2016-12-16 19:09:00 +0800
category:   "lambda"
tags:       "functional-programming"
excerpt:    "敬请期待"
---

像我们这样的程序员，可能是伴随着面向对象编程和编程范式过来的。可能对Java或者C++一头雾水，或者很幸运在使用Ruby、Python或者C#等简洁语言作为入门语言--所以你应该比较习惯"类"、"对象"、"实例"、"静态方法"等概念。可能不太适应被称作"函数式编程"的奇怪范式背后的一些核心概念 -- 它不仅和面向对象相当不一样，而且与面向过程、基于原型等一系列常见范式风格迥异。

最近几年，函数式编程已然成为热门话题，但是这种编程范式可不是什么新概念。1990年诞生的Haskell可能是最具代表性的函数式编程语言，其他的还有Erlang、Scala、Clojure也属于函数式编程语言，他们都有其特定的拥趸。函数式编程一个优点是，能写出能正常运行的并行程序 -- 也就是说像deadlock(死锁)、starvation(饥饿)、thread-safety(线程安全)等常见问题不再是问题。基于过程的语言中，并发是一个灾难，因为状态能在任何给定时刻改变。对象具有状态，只要在词法作用域(或者动态作用域内，少量语言会使用)内，任何函数都可以操作修改任何变量 -- 这是十分强大的，但是在状态切换上很糟糕。

函数式编程有很多优其它优点可以吹捧，但是真正使其从当今众多编程语言中脱颖而出的是，能很好利用CPU的全部核心进行并行计算。所以今天我们来谈谈这种编程范式的一些核心概念。

前言：所有这些概念都是语言无关的(事实上，许多函数式语言并不完全遵循这些)，但是你一定要结合一门语言，Haskell是最合适不过的了(因为Haskell严格遵循函数式核心概念)。下面5个概念，是严格的理论驱动，能帮助定义最纯粹的函数式范式。

## 1.Functions are Pure

## 2.Functions are First-Class and can be Higher-Order

## 3.Variables are Immutable

## 4.Functions have Referential Transparency

## 5.Functional Programming is Based on Lambda Calculus

## 结语

----
来源:

[Core Functional Programming Concepts](https://thesocietea.org/2016/12/core-functional-programming-concepts/)

[如何读懂并写出装逼的函数式代码](http://coolshell.cn/articles/17524.html)