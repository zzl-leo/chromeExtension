/*
 * @Author: Pony
 * @Date: 2021-09-27 10:00:13
 * @LastEditors: Jack
 * @LastEditTime: 2021-10-12 18:59:21
 * @FilePath: \amz-report-tool\js\content-script.js
 */
$(function(){
    //接收popup发送过来的数据
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
    {
        // console.log(sender.tab ?"from a content script:" + sender.tab.url :"from the extension");
        if(request.cmd == 'test') console.log(request.value);
        sendResponse('我收到了你的消息！');
    });
    var data={
        url:window.location.href,//地址栏地址
        fromDate:'2020-12-01',//接口返回的初始日期
        toDate:'2021-09-01',//接口返回的截止日期
        urlGo:'/business-reports/ref=xx_sitemetric_dnav_xx#/report?id=102%3ADetailSalesTrafficBySKU&chartCols=&columns=0%2F1%2F2%2F3%2F4%2F5%2F6%2F7%2F8%2F9%2F10%2F11%2F12',//下载报表页面地址
        clickTimeOut:5000,//自动点击时间间隔
        nextAreaTimeOut:3000,//下一个区域跳转时间间隔
        isClick:true,//是否点击
        pwd:{
            "xinchen_usa@hotmail.com":"Xinchen20180628",
            "changyue_usa@hotmail.com":"Changyueusa"
        },
        init:()=>{
            if(data.url.indexOf('/business-reports/ref=xx_sitemetric_dnav_xx#/report')!=-1){//下载报表页面
                setTimeout(function(){
                    let urls=[];
                    const _li=$('.merchant-level li');
                    let _nextId='';
                    _li.each(function(i){
                        let _a=$(this).find('a');
                        let _id=_a.attr('id');
                        urls.push(_id);
                        if(_a.hasClass('currentSelection')){
                            //判断cookie存储的数组长度是否达到区域列表长度
                            // console.log(chrome.storage.local.get(['key']));
                              if(data.getCookie('areaArr')){
                                //不允许存在的数据加入缓存中
                                
                                if(data.getCookie('areaArr').indexOf(_a.attr('id'))==-1){
                                    console.log(1);
                                    data.setCookie('areaArr',data.getCookie('areaArr')+','+_a.attr('id'),1);
                                    chrome.storage.local.set({"areaArr": data.getCookie('areaArr')+','+_a.attr('id')});
                                    chrome.storage.local.get(['areaArr'], function(result) {
                                        console.log('Value currently is :' + result.areaArr);
                                    });
                                }
                                // else{
                                //     //如果缓存中存在此数据，则不允许下载
                                //     data.isClick=false;
                                // }
                            }else{
                                console.log(2);
                                data.setCookie('areaArr',_a.attr('id'),1);
                                chrome.storage.local.set({"areaArr": _a.attr('id')});
                                chrome.storage.local.get(['areaArr'], function(result) {
                                    console.log('Value currently is ' + result.areaArr);
                                });
                            }
                            let areaArr=data.getCookie('areaArr')?data.getCookie('areaArr').split(','):[];
                            console.log(areaArr);
                            if((i+1)==_li.length){//终止下载
                                if(areaArr.length!=_li.length){//如果缓存中的数据长度跟列表数据长度不一致，则自动切换还没完成
                                    _nextId=$('.merchant-level li:first-child').find('a').attr('id');
                                }else{
                                    data.isClick=false;
                                    return false;
                                }
                            }else{
                                if(areaArr.length==_li.length){//如果缓存中的数据长度跟列表数据长度一致，则自动切换完成
                                    data.isClick=false;
                                    return false;
                                }
                                _nextId=$(this).next().find('a').attr('id');
                            }
                        }
                    }); 
                    if(data.isClick){
                        console.log(data.getCookie('areaArr'));
                        //自动点击下载
                        // $('.css-1lafdix > kat-button').click();
                        //x秒后自动点击下一个区域
                        // setTimeout(function(){
                        //      data.eClick(_nextId);
                        // },data.nextAreaTimeOut)
                    }
                },data.clickTimeOut)
            }else if(data.url.indexOf('/home')!=-1){//亚马逊首页
                if(data.url.indexOf('sellercentral-japan')!=-1){
                    return;
                }
                setTimeout(function(){
                    const _li=$('.merchant-level li');
                    let areaArr=data.getCookie('areaArr')?data.getCookie('areaArr').split(','):[];
                    console.log(areaArr.length,_li.length);
                    if(areaArr.length!=_li.length){
                        //跳转至报表下载页面
                        window.location.href=data.urlGo+'&fromDate='+data.fromDate+'&toDate='+data.toDate;
                    }
                },data.clickTimeOut)
            }else if(data.url.indexOf('/signin')!=-1){//登录页
                let accountNo=$.trim($('.a-size-base').text());//获取账号
                let pw=$('#ap_password');//获取密码文本框
                if(data.pwd[accountNo]){
                    pw.val(data.pwd[accountNo]);//填充密码文本框
                    data.eClick('signInSubmit');
                }else{
                    alert('无法检测到您的账号，请手动输入账号密码！');
                }
            }
        },
        eClick:(dom)=>{
            // IE浏览器
            if(document.all) {
                document.getElementById(dom).click();
            }
            // 其它浏览器
            else {
                var e = document.createEvent("MouseEvents");
                e.initEvent("click", true, true);
                document.getElementById(dom).dispatchEvent(e);
            }
        },
        setCookie:(name,value,day)=>{
            var exp = new Date();
            exp.setTime(exp.getTime() + day*24*60*60*1000);
            document.cookie = name + "="+ escape (value) + ";domain=.amazon.com" +";expires=" + exp.toGMTString()+";path=/";
        },
        getCookie:(name)=>{
            var arr,reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
            if(arr=document.cookie.match(reg))
            return unescape(arr[2]);
            else
            return null;
        }

    }
    // data.init();
})