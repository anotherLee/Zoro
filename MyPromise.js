
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
  if (this.status === 'pending') {
    this.resolvedCallbacks.push(onResolved)
    this.rejectedCallbacks.push(onRejected)
  }
  // 如果是成功状态直接成功的回调函数
  if (this.status === 'fulfilled') {
    onResolved(this.data)
  }
  // 如果是失败状态直接调失败的回调函数
  if (this.status === 'rejected') {
    onRejected(this.reason)
  }
}
