from urllib import request,parse
import os, sys

prefix = 'what-is-spider.html,webpage.html,static-and-dynamic.html,check-element.html,preparatory-work.html,the-first-spider.html,user-agent.html,useragent-pool.html,url-coding.html,crawl-webpage.html,case01.html,regexp-syntax.html,re-module.html,csv-module.html,case02.html,pymysql.html,case03.html,requests.html,crawl-photo.html,requests-args.html,switchyomega.html,xpath.html,xpath-helper.html,lxml.html,lxml-case.html,case04.html,capture-package.html,case05.html,case06.html,json.html,cookie-login.html,multithreading.html,bs4.html,case07.html,selenium.html,selenium-using.html,selenium-case.html,scrapy.html,scrapy-case.html'
alllinks = prefix.split(',')

baseUrl = 'https://search.jd.com/Search?keyword=%E6%89%8B%E6%9C%BA&enc=utf-8&wq=%E6%89%8B%E6%9C%BA&pvid=8858151673f941e9b1a4d2c7214b2b52';

# 创建的目录
path = "jdshouji"
folder = os.path.exists(path)
if not folder:
    os.mkdir(path)
else :
    print("-- exists folder")

for x in range(164, 186):
    # 1.拼url地址
    full_url = ''
    
    if x%2 == 0:
        full_url = baseUrl +'&page=' + str(x) + '&s=' + str(30 * (x-1) + 1)+ '&scrolling=y'
    else:
        full_url = baseUrl +'&page=' + str(x) + '&s=' + str(30 * (x-1) + 1)+ '&click=0'
    
    # 2.发请求保存到本地
    headers = {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:6.0) Gecko/20100101 Firefox/6.0'}
    req = request.Request(url=full_url,headers=headers)
    res = request.urlopen(req)
    html = res.read().decode('utf-8')

    # 3.保存文件至当前目录
    filename = path + '/phonepage' + str(x) + '.html'
    with open(filename,'w',encoding='utf-8') as f:
        f.write(html)
    print("-- load >>>> " + filename)
print("-- load success")