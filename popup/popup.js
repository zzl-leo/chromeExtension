$(function(){
    var popup={
        task:false,
        phone:'',
        loginTip:'注：请检查账号或者密码是否输入',
        taskTip:'注：请检查日期或者国家是否选择',
        requestUrl:'https://demo.zhdoit.com/api/amazonmws/',
        init:function(){
            //如果有用户数据，则不走登录流程
            chrome.storage.local.get(['userData'],function(e){
                if(e.userData != null || e.userData != undefined){
                    $('#login-body,#taskList').hide();
                    $('#amazon-body').show();
                    $('#user').text('用户：'+e.userData.phone);
                    $('#sellerid').val(e.userData.phone);
                    $('.tab').css('display','inline-block');
                }
            });
            chrome.storage.local.get(['data'],function(e){
                if(e.data != null || e.data != undefined){
                    $('#login-body,#amazon-body').hide();
                    $('#taskList').show();
                    $('.tab').css('display','inline-block');
                    $('#tab-taskList').addClass('active').siblings().removeClass('active');
                }
            });
            chrome.storage.local.get(['taskNum'],(t)=>{
                $('#taskNum').text(t.taskNum);
            });
            $('#phone,#pwd').on('blur',()=>{
                let phone=$.trim($('#phone').val());
                let pwd=$.trim($('#pwd').val());
                if(phone!='' && pwd!=''){
                    $('.error').hide();
                }
            });
            chrome.storage.local.get(['countrys'],(c)=>{
                if(!c.countrys){
                    return;
                };
                c=JSON.parse(c.countrys);
                for(var i=0; i<c.length; i++){
                    var countryCode=c[i].countryCode;
                    $('#countrys').append('<label id="'+countryCode+'"><input for="'+countryCode+'" type="checkbox" value="'+countryCode+'" /><span>'+countryCode+'</span></label>')
                }
            })
            //生成日期控件
            laydate.render({
                elem: '#date',
                theme: '#4db2a4',
                range: true
            });
            //登录
            $('#login').on('click',function(){
                let $this=$(this);
                let phone=$.trim($('#phone').val());
                let pwd=$.trim($('#pwd').val());
                if(phone=='' || pwd==''){
                    $('.error').text(popup.loginTip).show();
                    return;
                }
                if(phone!='' && pwd!=''){
                    $('.error').hide();
                }
                $this.text("登录中...").prop("disabled","disabled").addClass('active');
                var userInfo={phone:phone,password:popup.md5(pwd)};
                $.ajax({
                    url:popup.requestUrl+'reportUser/login',
                    contentType : 'application/json;charset=utf8',
                    data:JSON.stringify(userInfo),
                    dataType:'json',
                    type:'post',
                    success:function(res){
                        if(res.code==0 && res.msg=="OK"){
                            chrome.storage.local.set({"userData": res.data});
                            popup.phone=res.data.phone;
                            $('.tab').css('display','inline-block');
                            $('#login-body').hide();
                            $('#amazon-body').show();
                            $('#sellerid').val(popup.phone);
                            $('#user').text('用户：'+popup.phone);
                            $.ajax({
                                url:popup.requestUrl+"reportUserConfig/list",
                                headers:{'Authorization':res.data.token},
                                contentType : 'application/json;charset=utf8',
                                type:'post',
                                success:function(countryList){
                                    if(countryList.code==0 && countryList.msg=="OK"){
                                        chrome.storage.local.set({'countrys':JSON.stringify(countryList.data)});
                                        for(var i=0; i<countryList.data.length; i++){
                                            var countryCode=countryList.data[i].countryCode;
                                            $('#countrys').append('<label id="'+countryCode+'"><input for="'+countryCode+'" type="checkbox" value="'+countryCode+'" /><span>'+countryCode+'</span></label>')
                                        }
                                    }else{
                                        console.error(countryList);
                                    }
                                },
                                error:function(errorMsg){
                                    console.error(errorMsg);
                                }
                            });

                            popup.getList(res.data.token,1);
                        }else{
                            $this.text("登录").prop("disabled",false).removeClass('active');
                            $('.error').text('注：'+res.msg).show();
                            console.error(res);
                        }
                    },
                    error:function(res){
                        console.error(res);
                    }
                })
            });

            //生成任务
            $('#running').on('click',function(){
                // jQuery.support.cors = true;
                var $this=$(this);
                var creatData={
                    countryCodes:[],
                    startDate:'',
                    endDate:'',
                    taskType:'bsrReport'
                };
                // var userData={ sellerId: "A14NOU8X9PJTW8"};
                var date=document.getElementById('date').value.replace(/\s*/g,"").split('-');
                var start='',end='';
                for(var i=0; i<date.length; i++){
                    if(i<3){
                        start+=date[i]+'-';
                    }else{
                        end+=date[i]+'-';
                    }
                }
                creatData.startDate=start.substr(0,start.lastIndexOf('-'));
                creatData.endDate=end.substr(0,end.lastIndexOf('-'));
                $('#countrys label').each((i,val)=>{
                   if($(val).find('input').is(':checked')){
                       creatData.countryCodes.push($(val).find('input').val());
                   }
                });
                if(creatData.countryCodes.length<=0 || creatData.startDate=='' || creatData.endDate==''){
                    $('.error').text(popup.taskTip).show();
                    return;
                }
                $this.text("任务生成中...").prop("disabled","disabled").addClass('active');
                chrome.storage.local.get(['userData'],(u)=>{
                    console.log('token:'+u.userData.token);
                    $.ajax({
                        url:popup.requestUrl+"reportPageTask/create",
                        type:'POST',
                        headers:{'Authorization':u.userData.token},
                        contentType : 'application/json;charset=utf8',
                        data:JSON.stringify(creatData),
                        dataType:'json',
                        success:function(res){
                            if(res.code==0 && res.msg=="OK"){
                                popup.getList(u.userData.token,0);
                            }
                        },
                        error:function(res){
                            $('.error').text('注：'+res.msg).show();
                            console.error(res);
                        }
                    });
                })
            });
            //任务下载状态
            chrome.storage.local.get(['fileName'],(f)=>{
                if(f.fileName!=''){
                    chrome.storage.local.get(['data'],(d)=>{
                        if(JSON.parse(d.data).length<=0){
                            $('#curTask').text('暂无下载任务');
                        }else{
                            $('#curTask').text(f.fileName).removeClass('downLoad');
                        }
                    })
                }else{
                    $('#curTask').text('下载终止，点此继续下载。').addClass('downLoad');
                }
            });
            //接收后台传来的已完成任务
            chrome.storage.local.get(["fileList"],(fileList)=>{
                if(fileList.fileList){
                    let fileHtml='';
                    let fileArr=fileList.fileList.split(',');
                    for(var i=0; i<fileArr.length; i++){
                        if(i>=100){
                            break;
                        }
                        fileHtml += '<p>'+(i+1)+'、'+fileArr[i]+'</p>'
                    }
                    $('#listContent').html(fileHtml);
                    // $('#downloaded').text(fileArr.length);
                }
            });
            //继续下载
            $('body').delegate('.downLoad','click',()=>{
                chrome.storage.local.set({"goRsb":0});
                function sendMessageToContentScript(message, callback){
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
                    {
                        chrome.tabs.sendMessage(tabs[0].id, message, function(response)
                        {
                            if(callback) callback(response);
                        });
                    });
                }
                chrome.storage.local.get(["data"],(result)=>{
                    console.log(result.data);
                    sendMessageToContentScript({cmd:'hasData', value:JSON.parse(result.data)});
                })
            });
            //切换
            $('.tab>li').click(function(){
                $(this).addClass('active').siblings().removeClass('active');
                let bingData=$(this).attr('bind-data');
                let sibling=$(this).siblings().attr('bind-data');
                $('#'+bingData).show();
                $('#'+sibling).hide();
            })
        },
        getList:function(token,isTaskList){
            $.ajax({
                url:popup.requestUrl+"reportPageTask/list",
                type:'POST',
                // dataType:'json',
                // data:JSON.stringify(userData),
                contentType : 'application/json;charset=utf8',
                headers:{'Authorization':token},
                success:function(result){
                    if(result.code==0 && result.msg=='OK'){
                        $('.error').hide();
                        $('#taskNum').text(result.data.length);
                        if(isTaskList==0){
                            $('#tab-taskList').addClass('active').siblings().removeClass('active');
                            $('#running').text("任务已生成").prop("disabled",false).removeClass('active');
                            $('#amazon-body').hide();
                            $('#taskList').show();
                            if($('#curTask').text().indexOf('.csv')!=-1){
                                return;
                            }
                            chrome.storage.local.set({"goRsb": "0","taskNum":result.data.length,"data":JSON.stringify(result.data)});
                            function sendMessageToContentScript(message, callback){
                                chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
                                {
                                    chrome.tabs.sendMessage(tabs[0].id, message, function(response)
                                    {
                                        if(callback) callback(response);
                                    });
                                });
                            }
                            sendMessageToContentScript({cmd:'hasData', value:result.data});
                        }
                    }
                },
                error:function(result){
                    $('.error').text('注：'+res.msg).show();
                    console.log('error:'+result);
                }
            })
        },
        md5:function (string) {
            function rotateLeft(lValue, iShiftBits) {
                return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
            }
            function addUnsigned(lX, lY) {
                var lX4, lY4, lX8, lY8, lResult;
                lX8 = (lX & 0x80000000);
                lY8 = (lY & 0x80000000);
                lX4 = (lX & 0x40000000);
                lY4 = (lY & 0x40000000);
                lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
                if (lX4 & lY4) {
                    return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
                }
                if (lX4 | lY4) {
                    if (lResult & 0x40000000) {
                        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                    } else {
                        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                    }
                } else {
                    return (lResult ^ lX8 ^ lY8);
                }
            }
        
            function f(x, y, z) {
                return (x & y) | ((~x) & z);
            }
        
            function g(x, y, z) {
                return (x & z) | (y & (~z));
            }
        
            function h(x, y, z) {
                return (x ^ y ^ z);
            }
        
            function i(x, y, z) {
                return (y ^ (x | (~z)));
            }
        
            function FF(a, b, c, d, x, s, ac) {
                a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
                return addUnsigned(rotateLeft(a, s), b);
            }
        
            function GG(a, b, c, d, x, s, ac) {
                a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
                return addUnsigned(rotateLeft(a, s), b);
            }
        
            function HH(a, b, c, d, x, s, ac) {
                a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
                return addUnsigned(rotateLeft(a, s), b);
            }
        
            function II(a, b, c, d, x, s, ac) {
                a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
                return addUnsigned(rotateLeft(a, s), b);
            }
        
            function convertToWordArray(string) {
                var lWordCount;
                var lMessageLength = string.length;
                var lNumberOfWords_temp1 = lMessageLength + 8;
                var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
                var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
                var lWordArray = new Array(lNumberOfWords - 1);
                var lBytePosition = 0;
                var lByteCount = 0;
                while (lByteCount < lMessageLength) {
                    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                    lBytePosition = (lByteCount % 4) * 8;
                    lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
                    lByteCount++;
                }
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
                lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
                lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
                return lWordArray;
            }
        
            function wordToHex(lValue) {
                var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
                for (lCount = 0; lCount <= 3; lCount++) {
                    lByte = (lValue >>> (lCount * 8)) & 255;
                    WordToHexValue_temp = "0" + lByte.toString(16);
                    WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
                }
                return WordToHexValue;
            }
        
            function utf8Encode(string) {
                string = string.replace(/\r\n/g, "\n");
                var utftext = "";
        
                for (var n = 0; n < string.length; n++) {
        
                    var c = string.charCodeAt(n);
        
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if ((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
        
                }
        
                return utftext;
            }
        
            var x = [],
                k, AA, BB, CC, DD, a, b, c, d,
                S11 = 7, S12 = 12, S13 = 17, S14 = 22,
                S21 = 5, S22 = 9 , S23 = 14, S24 = 20,
                S31 = 4, S32 = 11, S33 = 16, S34 = 23,
                S41 = 6, S42 = 10, S43 = 15, S44 = 21;
        
            string = utf8Encode(string);
        
            x = convertToWordArray(string);
        
            a = 0x67452301;
            b = 0xEFCDAB89;
            c = 0x98BADCFE;
            d = 0x10325476;
        
            for (k = 0; k < x.length; k += 16) {
                AA = a;
                BB = b;
                CC = c;
                DD = d;
                a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
                d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
                c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
                b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
                a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
                d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
                c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
                b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
                a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
                d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
                c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
                b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
                a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
                d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
                c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
                b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
                a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
                d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
                c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
                b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
                a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
                d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
                c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
                b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
                a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
                d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
                c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
                b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
                a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
                d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
                c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
                b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
                a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
                d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
                c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
                b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
                a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
                d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
                c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
                b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
                a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
                d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
                c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
                b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
                a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
                d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
                c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
                b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
                a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
                d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
                c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
                b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
                a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
                d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
                c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
                b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
                a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
                d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
                c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
                b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
                a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
                d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
                c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
                b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
                a = addUnsigned(a, AA);
                b = addUnsigned(b, BB);
                c = addUnsigned(c, CC);
                d = addUnsigned(d, DD);
            }
        
            var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
        
            return temp.toUpperCase();
        }
    }
    popup.init();
    
    //接收后台传来的数据
    // var port = chrome.extension.connect({
    //     name: "Sample Communication"
    // });
    // port.postMessage("Hi BackGround");
    // port.onMessage.addListener(function(msg) {
    //     $('#curTask').text(msg);
    //     console.log("已接收" + msg);
    // });
})