
// var product = JSON.parse(localStorage.getItem('product'))
// console.log(localStorage.getItem('product'))

// const pic = document.querySelector('.prod-pic')
// const title = document.querySelector('.prod-title')
// const price = document.querySelector('.prod-price')
// pic.src = product.imgUrl
// title.innerText = product.name
// title.href = product.url
// price.innerText = product.price + '$'

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { msg: 'req' }, () => { })
});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    const loader = document.querySelector('.loader')
    const msg = request.msg
    console.log(msg)
    switch (msg) {
        case 'loading':
            loader.hidden = false
            break
        case 'loaded':
            loader.hidden = true
            break
        default:
            const pic = document.querySelector('.prod-pic')
            const title = document.querySelector('.prod-title')
            const price = document.querySelector('.prod-price')
            pic.src = msg.imgUrl
            title.innerText = msg.name
            title.href = msg.url
            price.innerText = msg.price + '$'
            break
    }
})

