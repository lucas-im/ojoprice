const site = {
  AMAZON: 'amazon.com',
  EBAY: 'ebay.com'
}

let currSite = null
let prod = null

class Product {
  constructor(name, price, url, imgUrl, match) {
    this.name = name
    this.price = price
    this.url = url
    this.imgUrl = imgUrl
    this.match = match
  }
}

const strMatchCnt = (src, tgt) => {
  let cnt = 0
  for (let i = 0; i < src.length; i++) {
    if (src[i] === tgt[i]) cnt++
  }
  return cnt
}

const procStr = str => {
  const subStr = str.split(' ')
  let newStr = ''
  for (let i = 0; i < subStr.length; i++) {
    newStr += subStr[i] + ' '
    if (subStr[i].match(/[0-9,()]/g) !== null) break
  }
  return newStr.toLowerCase().replace(/[^A-Z, a-z0-9]/g, '').replace(/\s/g, '+')
}

const sendReq = (title, origin) => {
  const req = new XMLHttpRequest()
  req.onload = (res) => {
    if (origin === site.AMAZON) prod = parseEbay(res.target.response, title)
    else if (origin === site.EBAY) prod = parseAmazon(res.target.response, title)
    console.log(prod)
    sendMsg('loaded')
    sendMsg(prod)
    postToWp(prod)
  }
  let reqUrl = ''
  console.log(procStr(title))
  console.log(origin === site.EBAY)
  if (origin === site.AMAZON)
    reqUrl = `https://cors-anywhere-98927.herokuapp.com/ebay.com/sch/i.html?_from=R40&_trksid=p2380057.m570.l1313&_nkw=${procStr(title)}&_sacat=0`
  else if (origin === site.EBAY) reqUrl = `https://cors-anywhere-98927.herokuapp.com/amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=${procStr(title)}`
  console.log(reqUrl)
  req.open('GET', reqUrl, 'true')
  req.setRequestHeader('x-requested-with', 'XMLHttpRequest')
  req.send()
}

const sendMsg = msg => {
  chrome.runtime.sendMessage({
    msg: msg
  })
}

const parseEbay = (str, title) => {
  const el = document.createElement('html')
  el.innerHTML = str
  const titles = el.getElementsByClassName('s-item__title')
  let products = []
  for (let i = 0; i < 10; i++) {
    if (titles[i] === undefined || titles[i].innerText === 'Shop on eBay') continue
    console.log(titles[i])
    let price = titles[i].parentElement.nextElementSibling.nextElementSibling.getElementsByTagName('span')[0].innerText.split('$')[1]
    console.log(price)
    if (isNaN(price)) continue
    products.push(new Product(titles[i].innerText, price, titles[i].parentElement.href, titles[i].parentElement.parentElement.previousElementSibling.getElementsByTagName('img')[0].src, null))
  }
  for (let j = 0; j < products.length; j++) {
    products[j].match = strMatchCnt(products[j].name, title)
  }
  products.sort((a, b) => b.match - a.match)
  console.log(products)
  return products[0]
}

const parseAmazon = (str, title) => {
  const el = document.createElement('html')
  console.log('on amazon')
  el.innerHTML = str
  const titles = el.getElementsByClassName('a-size-medium')
  let products = []
  for (let i = 0; i < 4; i++) {
    if (titles[i] === undefined || titles[i].nodeName === 'H2' || titles[i].children?.length > 0) continue
    let price = titles[i].parentElement.parentElement.parentElement.nextElementSibling.nextElementSibling.getElementsByTagName('span')[0].innerText.split('$')[1]
    if (isNaN(price)) continue
    products.push(new Product(titles[i].innerText, price, titles[i].parentElement.href.replace('ebay.com', 'amazon.com'), titles[i].parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.previousElementSibling.getElementsByTagName('img')[0].src, null))
  }
  for (let j = 0; j < products.length; j++) {
    products[j].match = strMatchCnt(products[j].name, title)
  }
  products.sort((a, b) => b.match - a.match)
  console.log(products[0])
  return products[0]
}

if (window.sessionStorage !== 'undefined' && document.URL.indexOf(site.AMAZON) > -1 || document.URL.indexOf(site.EBAY) > -1) {
  if (document.URL.indexOf(site.AMAZON) > -1) currSite = site.AMAZON
  else if (document.URL.indexOf(site.EBAY) > -1) currSite = site.EBAY
  if (currSite === site.AMAZON) {
    if (document.querySelector('#buy-now-button')) {
      console.log('product found! loading data...')
      sendMsg('loading')
      const title = document.querySelector('#productTitle').innerText
      sendReq(title, site.AMAZON)
    }
  }
  else if (currSite === site.EBAY) {
    if (document.querySelector('#binBtn_btn')) {
      console.log('product found! loading data...')
      sendMsg('loading')
      const title = document.querySelector('.x-item-title__mainTitle').children[0].innerText
      sendReq(title, site.EBAY)
    }
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.msg === 'req' && prod !== null) {
    sendMsg(prod)
  }
})

postToWp = (prod) => {
  const pReq = new XMLHttpRequest()
  pReq.onload = (res) => {
    const jsonRes = JSON.parse(res.target.response)
    for (let i = 0; i < jsonRes.length; i++) {
      console.log(jsonRes[i])
      const postDate = parseFloat(jsonRes[i].content.rendered.split('datetime&#8221;:')[1].split(',&#8221;')[0])
      if (procStr(jsonRes[i].title.rendered) === procStr(prod.name)) {
		//Uncomment to only post in every 12 hours.
        // if (postDate - new Date().getTime() > 4.32e+7) {
        console.log('posting to wp')
        const wpReq = new XMLHttpRequest()
        wpReq.onload = (res) => {
          console.log(res.target.response)
        }
        wpReq.open('POST', `http://localhost/wp-json/wp/v2/posts/${jsonRes[i].id}`)
        wpReq.setRequestHeader('Content-Type', 'application/json')
        wpReq.setRequestHeader('Authorization', 'Basic ' + btoa('june.main.ca@gmail.com:WY0iDkP!&f0@FFItk#gnwuas'))
        wpReq.send(JSON.stringify({
          title: prod.name,
          content: JSON.stringify(jsonRes[i].content.rendered) + JSON.stringify({
            price: prod.price,
            datetime: new Date().getTime()
          }),
          status: 'publish'
        }))
        return
        // }
      }
    }
    const req = new XMLHttpRequest()
    req.onload = (res) => {
      console.log(res.target.response)
    }
    req.open('POST', 'http://localhost/wp-json/wp/v2/posts')
    req.setRequestHeader('Content-Type', 'application/json')
    req.setRequestHeader('Authorization', 'Basic ' + btoa('june.main.ca@gmail.com:WY0iDkP!&f0@FFItk#gnwuas'))
    req.send(JSON.stringify({
      title: prod.name,
      content: JSON.stringify({ price: prod.price, datetime: new Date().getTime(), url: prod.url }),
      status: 'publish'
    }))
  }
  pReq.open('GET', 'http://localhost/wp-json/wp/v2/posts')
  pReq.setRequestHeader('Content-Type', 'application/json')
  pReq.send()
}