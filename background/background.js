$(function() {
    var requestUrl="https://demo.zhdoit.com/api/amazonmws/reportPageTask/";
    //定时刷新任务列表(5分钟)
    setInterval(()=>{
        let date=new Date();
        console.log('定时任务开启：'+date);
        chrome.storage.local.get(['data'],(timeData)=>{
            console.log(timeData.data);
            timeData=JSON.parse(timeData.data);
            if(!timeData || timeData.length<=0){
                console.log('定时任务：'+timeData.length);
                chrome.storage.local.get(['userData'],function(userData){
                    $.ajax({
                        url:requestUrl+"list?r="+date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+','+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds(),
                        type:'POST',
                        // dataType:'json',
                        // data:JSON.stringify(userData),
                        contentType : 'application/json;charset=utf8',
                        headers:{'Authorization':userData.userData.token},
                        success:function(result){
                            if(result.msg=='OK' && result.data.length>0){
                                //有新任务时
                                chrome.storage.local.set({"taskNum":result.data.length});
                                let views = chrome.extension.getViews({
                                    type: "popup"
                                });
                                for (let i = 0; i < views.length; i++) {
                                    views[i].document.getElementById('taskNum').innerHTML =result.data.length;
                                    chrome.storage.local.set({"taskNum":result.data.length});
                                };
                                chrome.storage.local.set({"goRsb": "0","data":JSON.stringify(result.data)});
                                function sendMessageToContentScript(message, callback){
                                    chrome.tabs.query({active: true}, tabs=>{
                                        console.log(tabs);
                                        chrome.tabs.sendMessage(tabs[0].id, message, function(response)
                                        {
                                            if(callback) callback(response);
                                        });
                                    });
                                }
                                sendMessageToContentScript({cmd:'hasData', value:result.data});
                            }
                        },
                        error:function(result){
                            console.log('error:'+result);
                        }
                    })
                })
            }
        });
    },5*60*1000);
    //清除缓存
    // chrome.storage.local.clear( function() {
    //     console.log('remove all');
    // });
    //监听是否在亚马逊页面，如果是则显示插件图标，否则隐藏
    chrome.runtime.onInstalled.addListener(function(){
        chrome.declarativeContent.onPageChanged.removeRules(undefined, function(){
            chrome.declarativeContent.onPageChanged.addRules([
                {
                    conditions: [
                        // 只有打开亚马逊才显示pageAction
                        new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: {urlContains: 'sellercentral.amazon.co.uk'}
                        }),
                        new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: {urlContains: 'sellercentral.amazon.com'}
                        })
                    ],
                    actions: [new chrome.declarativeContent.ShowPageAction()]
                }
            ]);
        });
    });

    // 监听来自content-script的消息
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
        //登录通知
        if(request.login=='notify'){
            chrome.storage.local.get(["isLoad"],function(r){
                console.log('isLoad：'+r.isLoad);
            });
            chrome.storage.local.get(['taskId'],(t)=>{
                $.ajax({
                    url:'https://demo.zhdoit.com/api/amazonmws/reportPageTask/notify',
                    type:'POST',
                    dataType:'json',
                    data:JSON.stringify({"notifyContent":"bsr报表插件检测到需要登录，请您前往亚马逊页面进行登录","taskId":t.taskId}),
                    contentType : 'application/json;charset=utf8',
                    success:function(result){

                    }
                });
            });
            sendResponse('已收到，正在通知');
            return;
        };
        //下载通知
        var fileName=request.reportType+'_'+request.curCountry+'_'+request.sellerId+'_'+request.countryCode+'_'+request.taskId+'_'+request.curDate+'.csv';
        var fileUrl='';
        sendResponse('已收到：' + JSON.stringify(request));
        
        // 将文件转base64位
        downloadUrlFile(request.url,fileName);
        function downloadUrlFile(url, fileName) {
            const url2 = url.replace(/\\/g, '/');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url2, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
                if (xhr.status === 200) {
                    // 获取文件blob数据并保存
                    // console.log(xhr.response);
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        fileUrl=e.target.result;
                        console.log(request.curDate+':'+e.target.result);
                    };
                    console.log(xhr.response.type);
                    reader.readAsDataURL(xhr.response);
                }
            };
            xhr.send();
        }
        //下载文件并且更换文件名称
        chrome.downloads.download({
            url:request.url,
            conflictAction: "overwrite",
            filename:fileName
        },(res) =>{
            //向popup.html发送当前下载任务
            chrome.storage.local.set({'fileName':fileName});
            var views = chrome.extension.getViews({
                type: "popup"
            });
            for (var i = 0; i < views.length; i++) {
                views[i].document.getElementById('curTask').innerHTML = fileName;
                views[i].document.getElementById('curTask').removeAttribute('class');
                // $('#curTask').removeClass('downLoad');
            }
            //抓取当前下载任务状态
            var timeout=setInterval(() => {
                chrome.downloads.search({id:res}, (data) => {
                    console.log(data[0].state);
                    if(data[0].state=="complete"){
                        clearInterval(timeout);
                        console.log(data[0].filename);
                        //浏览器右下角提示
                        chrome.notifications.create(null, {
                            type:'basic',
                            iconUrl: 'img/icon.png',
                            title: '下载成功!',
                            message: '下载文件：'+fileName
                          });
                        console.log("下载完成！"+data[0]);

                        chrome.storage.local.set({"isLoad": 0});
                        //发送下载成功文件到已下载任务列表中
                        chrome.storage.local.get(["fileList"],(getfl)=>{
                            var fileNum=100;
                            if(getfl.fileList){
                                //文件列表展示不允许超过100个
                                if(getfl.fileList.split(',').length>=fileNum){
                                    getfl.fileList=getfl.fileList.substr(0,getfl.fileList.lastIndexOf(','));
                                }
                                chrome.storage.local.set({"fileList":fileName+','+getfl.fileList});
                            }else{
                                chrome.storage.local.set({"fileList":fileName});
                            }
                            chrome.storage.local.get(["fileList"],(fileList)=>{
                                let fileHtml='';
                                let fileArr=fileList.fileList.split(',');
                                for(var i=0; i<fileArr.length; i++){
                                    if(i>=100){
                                        break;
                                    }
                                    fileHtml += '<p>'+(i+1)+'、'+fileArr[i]+'</p>'
                                }
                                var fileListViews = chrome.extension.getViews({
                                    type: "popup"
                                });
                                for (var i = 0; i < fileListViews.length; i++) {
                                    fileListViews[i].document.getElementById('listContent').innerHTML = fileHtml;
                                    // fileListViews[i].document.getElementById('downloaded').innerHTML=fileArr.length;
                                }
                            })
                        });
                        //更新当前任务状态                     
                        let updateData={taskId:request.taskId , base64FileUrl:fileUrl , taskStatus:"2"};
                        $.ajax({
                            url:requestUrl+"update",
                            data:JSON.stringify(updateData),
                            type:'POST',
                            dataType:'json',
                            contentType : 'application/json;charset=utf8',
                            success:function(result){
                                //完成此次任务
                                if(result.code==0 && result.msg=="OK"){
                                    console.log(result.msg);
                                    // var userData={ sellerId: "A14NOU8X9PJTW8"};
                                    chrome.storage.local.get(['userData'],function(userData){
                                        $.ajax({
                                            url:requestUrl+"list",
                                            type:'POST',
                                            // dataType:'json',
                                            // data:JSON.stringify(userData),
                                            contentType : 'application/json;charset=utf8',
                                            headers:{'Authorization':userData.userData.token},
                                            success:function(result){
                                                if(result.msg=='OK'){
                                                    chrome.storage.local.set({"goRsb": "0","taskNum":result.data.length,"data":JSON.stringify(result.data)});
                                                    var views = chrome.extension.getViews({
                                                        type: "popup"
                                                    });
                                                    for (var i = 0; i < views.length; i++) {
                                                        views[i].document.getElementById('taskNum').innerHTML = result.data.length;
                                                        if(result.data.length<=0){
                                                            views[i].document.getElementById('curTask').innerHTML = '暂无下载任务';
                                                        }
                                                    };
                                                    function sendMessageToContentScript(message, callback){
                                                        chrome.tabs.query({active: true}, tabs=>{
                                                            chrome.tabs.sendMessage(tabs[0].id, message, function(response)
                                                            {
                                                                if(callback) callback(response);
                                                            });
                                                        });
                                                    }
                                                    sendMessageToContentScript({cmd:'hasData', value:result.data});
                                                }
                                            },
                                            error:function(result){
                                                console.log('error:'+result);
                                            }
                                        })
                                    })
                                }
                            },
                            error:function(result){
                                console.error(result);
                            }
                        })
                    }else if(data[0].state=="interrupted"){
                        chrome.storage.local.set({"isLoad":0,"fileName":''});
                        clearInterval(timeout);
                        alert("下载中断，出现错误！");
                    }
                })
            }, 3000);
        });
        // var fileName='bsr-amzon/BusinessReport-'+request.countryCode+'-'+request.curDate+'.csv';
        // const ossUrl="https://demo.zhdoit.com/api/filecenter/file/assumerole";
        // const blobUrl=window.URL.createObjectURL(new Blob(request.url))
        // console.log(blobUrl);
        // return;
        // $.ajax({
        //     url:ossUrl,
        //     type:'post',
        //     success:function(data){
        //         if(data.code==0){
        //             const client = new OSS({
        //                 region: 'oss-cn-shenzhen',
        //                 // 从STS服务获取的临时访问密钥（AccessKey ID和AccessKey Secret）。
        //                 accessKeyId: data.data.credentials.accessKeyId,
        //                 accessKeySecret: data.data.credentials.accessKeySecret,
        //                 // 从STS服务获取的安全令牌（SecurityToken）。
        //                 stsToken: data.data.credentials.securityToken,
        //                 // 刷新临时访问凭证的时间间隔，单位为毫秒。
        //                 refreshSTSTokenInterval: 300000,
        //                 // 填写Bucket名称。
        //                 bucket: 'uat-pixus-erp'
        //               });
        //               async function put () {
        //                 try {
        //                   // object表示上传到OSS的文件名称。
        //                   // file表示浏览器中需要上传的文件，支持HTML5 file和Blob类型。
        //                   const file_re = await readFileAsBuffer(request.url);
        //                   const result = await client.put(fileName, file_re);
        //                   console.log('put success: %j', result);
        //                 } catch (e) {
        //                   console.error('error: %j', e);
        //                 }
        //               }
                      
        //               put(); 
        //         }
        //     },
        //     error:function(data){
        //         console.log('error:'+data);
        //     }
        // });
    });
});
 