#### 一、承上

本篇文章是《包教包会，和你实现一个Promise》的第二篇，紧接着第一篇的内容。所以，如果你还没有看过第一篇，你可能需要看一下[包教包会，和你实现一个Promise（一）](https://github.com/anotherLee/Zoro/blob/master/notes/包教包会，和你实现一个Promise(一).md)。

第一篇我们已经实现了一个形式上非常类似Promise的MyPromise，但是尽管使用形式有点像，它离完全符合Promise A+规范的Promise还差的远。现在的MyPromise：

```javascript
function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []

  let resolve = (value) => {
    if (this.status === 'pending') {
      this.status = 'fulfilled'
      this.data = value
      this.resolvedCallbacks.forEach(fn => fn(this.data))
    }
  }
  let reject = (reason) => {
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.reason = reason
      this.rejectedCallbacks.forEach(fn => fn(this.reason))
    }
  }
  executor(resolve, reject)
}

MyPromise.prototype.then = function(onResolved, onRejected) {
  let promise2
  if (this.status === 'pending') {
    this.resolvedCallbacks.push(onResolved)
    this.rejectedCallbacks.push(onRejected)
  }
  if (this.status === 'fulfilled') {
    onResolved(this.data)
  }
  if (this.status === 'rejected') {
    onRejected(this.reason)
  }
}
```

现在这个MyPromise的问题在于，它无法进行链式调用。我们在使用Promise的时候，会有这样的代码：

```javascript
let promise1 = new Promise(function(resolve, reject) {
  // 模拟异步
  setTimeout(() => {
    let flag = Math.random() > 0.5 ? true : false
    if (flag) {
      resolve('success')
    } else {
      reject('fail')
    }
  }, 1000)
})

promise1.then(res => {
  return 1
}, err => {
  return err
}).then(res => {
  console.log(res)
})
```

但是目前MyPromise的then是一次性，执行完了就完了，没有返回能then的东西。

#### 二、链式调用

**根据Promise A+规范，一个Promise实例在then之后一定会返回一个新的Promise实例，这样就可以使用then来实现链式调用了。** 

在实现then方法之前，我们先简单聊一下实现链式调用的技巧。一般来说，实现链式调用有两个方法：

- 当某个方法执行时，返回自身，也就是返回this，比如jQuery就是这样做的
- 另一种，就是Promise这样，当then方法执行时，返回一个新的Promise实例

jQuery的链式调用可以大概























