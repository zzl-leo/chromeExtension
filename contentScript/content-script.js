/*
 * @Author: Pony
 * @Date: 2021-09-27 10:00:13
 * @LastEditors: Jack
 * @LastEditTime: 2021-10-12 18:59:21
 * @FilePath: \amz-report-tool\js\content-script.js
 */
$(function(){
    var urlGo='/business-reports/ref=xx_sitemetric_dnav_xx#/report?id=102%3ADetailSalesTrafficBySKU&chartCols=&columns=0%2F1%2F2%2F3%2F4%2F5%2F6%2F7%2F8%2F9%2F10%2F11%2F12';//下载报表页面地址   
    if(window.location.href.indexOf('/signin')!=-1){//登录页
        let rememberMe=$('input[name=rememberMe]');
        //自动勾选记住登录状态
        if(!rememberMe.is(":checked")){
            rememberMe.prop('checked',true);
        };
        chrome.runtime.sendMessage({"login":"notify"}, function(response) {
            console.log('收到来自后台的回复：' + response);
        });
    }
    //接收background，popup发送过来的数据
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
    {
        console.log('popup发送过来的数据：'+request.cmd);
        console.log('background发送过来的数据：'+request.cmd);
        if(request.cmd == 'hasData') {
            console.log('background发送过来的数据1：'+request.cmd);
            chrome.storage.local.get(['goRsb'], function(result) {
                //只有第一次生成任务的时候才走这一步，其余的都由浏览器区域列表点击跳转
                if(result.goRsb==1){
                    console.log('gorsb:'+result.goRsb);
                    chrome.storage.local.set({"goRsb": "0"});
                    setTimeout(() => {
                        let currentSelection=$('.currentSelection').prop('id');
                        let startDate,endDate;
                        for(var i=0; i<request.value.length; i++){
                            if(request.value[i].marketplaceId == currentSelection && request.value[i].taskStatus == 0){
                                startDate=request.value[i].startDate;
                                endDate=request.value[i].endDate;
                                chrome.storage.local.set({
                                    "date":{
                                        "startDate":request.value[i].startDate,
                                        "endDate":request.value[i].endDate
                                    },
                                    "taskId":request.value[i].id
                                });
                                break;
                            }
                        }
                        chrome.storage.local.set({"isLoad":1});
                        window.location.href=urlGo+'&fromDate='+startDate+'&toDate='+endDate; 
                        //同一页面需要重新加载
                        if(window.location.href.indexOf(urlGo)!=-1){
                            chrome.storage.local.set({"isLoad":1});
                            location.reload();
                        }
                    }, 5000);
                }else{
                    console.log('gorsb:'+result.goRsb);
                    chrome.storage.local.set({"isLoad":1});
                    for(var i=0; i<request.value.length; i++){
                        if(request.value[i].taskStatus == 0){
                            chrome.storage.local.set({
                                "date":{
                                    "startDate":request.value[i].startDate,
                                    "endDate":request.value[i].endDate
                                },
                                "taskId":request.value[i].id
                            });
                            // IE浏览器
                            if(document.all) {
                                console.log('ie：'+request.value[i].marketplaceId);
                                document.getElementById(request.value[i].marketplaceId).click();
                            }
                            // 其它浏览器
                            else {
                                console.log('其他浏览器：'+request.value[i].marketplaceId);
                                var e = document.createEvent("MouseEvents");
                                e.initEvent("click", true, true);
                                document.getElementById(request.value[i].marketplaceId).dispatchEvent(e);
                            }
                            break;
                        }
                    }
                }
            });          
        }
    });
    chrome.storage.local.get(["isLoad"],function(r){
        console.log('isload:'+r.isLoad);
        // return;
        if(r.isLoad==1){
            chrome.storage.local.get(["userData"],function(userData){
                if(userData.userData){
                    chrome.storage.local.get(["data"],function(e){
                        //任务data
                        e=JSON.parse(e.data);
                        if(e.length<=0 || !e){
                            console.log("暂无下载任务");
                            return;
                        }
                        var data={
                            dataList:e,
                            curCountry:'',
                            curCountryCode:'',
                            currentSelection:'',
                            taskId:'',
                            reportType:'',
                            sellerId:'',
                            url:window.location.href,//地址栏地址
                            fromDate:e[0].startDate,//接口返回的初始日期
                            toDate:e[0].endDate,//接口返回的截止日期
                            clickTimeOut:5000,//自动点击时间间隔
                            nextAreaTimeOut:3000,//下一个区域跳转时间间隔
                            isClick:true,//是否点击,
                            curDate:new Date().getFullYear()+''+(new Date().getMonth()+1)+''+new Date().getDate(),
                            pwd:{
                                "xinchen_usa@hotmail.com":"Xinchen20180628",
                                "changyue_usa@hotmail.com":"Changyueusa"
                            },
                            init:()=>{
                                chrome.storage.local.get(['date'],function(date){
                                    if(data.url.indexOf('/business-reports/ref=xx_sitemetric_dnav_xx#/report')!=-1 && date.date){//下载报表页面
                                        setTimeout(function(){
                                            if(date.date){
                                                var d={
                                                    "operationName": "reportDataDownloadQuery",
                                                    "variables": {
                                                        "input": {
                                                            "legacyReportId": "102:DetailSalesTrafficBySKU",
                                                            "startDate": date.date.startDate,
                                                            "endDate": date.date.endDate,
                                                            "userSelectedRows": [],
                                                            "selectedColumns": [
                                                                "SC_MA_ParentASIN_25990",
                                                                "SC_MA_ChildASIN_25991",
                                                                "sc_mat-ss_colDef_title",
                                                                "SC_MA_SKU_25959",
                                                                "SC_MA_Sessions_25920",
                                                                "SC_MA_SessionPercentage_25960",
                                                                "SC_MA_PageViews_25955",
                                                                "SC_MA_PageViewsPercentage_25961",
                                                                "SC_MA_BuyBoxPercentage_25956",
                                                                "SC_MA_UnitsOrdered_40590",
                                                                "SCA_BR_UnitsOrdered_BB",
                                                                "SC_MA_UnitSessionPercentage_25957",
                                                                "SCA_BR_UnitSessionPercentage_BB",
                                                                "SC_MA_OrderedProductSales_40591",
                                                                "SCA_BR_OrderedProductSales_BB",
                                                                "SC_MA_TotalOrderItems_1",
                                                                "SCA_BR_TotalOrderItems_BB"
                                                            ]
                                                        }
                                                    },
                                                    "query": "query reportDataDownloadQuery($input: GetReportDataInput) {\n  getReportDataDownload(input: $input) {\n    url\n    __typename\n  }\n}\n"
                                                }
                                                $.ajax({
                                                    url:"/business-reports/api",
                                                    type:'POST',
                                                    data:JSON.stringify(d),
                                                    contentType : 'application/json;charset=utf8',
                                                    dataType:'json',
                                                    success:function(result){
                                                        //判断当前是哪个国家
                                                        data.currentSelection=$('.currentSelection').prop('id');
                                                        for(var i=0; i<data.dataList.length; i++){
                                                            if(data.dataList[i].marketplaceId == data.currentSelection){
                                                                data.curCountryCode=data.dataList[i].marketplaceId;
                                                                data.curCountry=data.dataList[i].countryCode;
                                                                data.taskId=data.dataList[i].id;
                                                                data.taskType=data.dataList[i].taskType;
                                                                data.sellerId=data.dataList[i].sellerId;
                                                                data.curDate=data.dataList[i].startDate
                                                                break;
                                                            }
                                                        }
                                                        chrome.runtime.sendMessage({
                                                            "url":result.data.getReportDataDownload.url,
                                                            "curCountry":data.curCountry,
                                                            "countryCode":data.curCountryCode,
                                                            "curDate":data.curDate,
                                                            "taskId":data.taskId,
                                                            "sellerId":data.sellerId,
                                                            "reportType":data.taskType,
                                                            "curDate":data.curDate
                                                        }, function(response) {
                                                            console.log('收到来自后台的回复：' + response);
                                                        });
                                                    },
                                                    error:function(result){
                                                        console.log(result);
                                                    }
                                                })
                                            }
                                        },data.clickTimeOut)
                                    }else{//其他页面
                                        if(date.date){
                                            //跳转至报表下载页面
                                            window.location.href=urlGo+'&fromDate='+date.date.startDate+'&toDate='+date.date.endDate;
                                        }
                                    }
                                    // else if(data.url.indexOf('/home')!=-1 && date.date){//亚马逊首页
                                    //     if(data.url.indexOf('sellercentral-japan')!=-1){
                                    //         return;
                                    //     }
                                    //     //跳转至报表下载页面
                                    //     window.location.href=urlGo+'&fromDate='+date.date.startDate+'&toDate='+date.date.endDate;
                                    // }
                                })
                                
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
                            }
                
                        }
                        data.init();
                    });
                }
            });
        }
    })
})