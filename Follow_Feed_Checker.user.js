// ==UserScript==
// @name        Follow Feed Checker
// @namespace        http://tampermonkey.net/
// @version        2.6
// @description        「フォローフィード」の管理補助ツール
// @author        Ameba Blog User
// @match        https://www.ameba.jp/home
// @match        https://blog.ameba.jp/ucs/blgfavorite/*
// @match        https://blog.ameba.jp/ucs/top.do
// @icon        https://www.google.com/s2/favicons?sz=64&domain=ameba.jp
// @grant        none
// @updateURL        https://github.com/personwritep/Follow_Feed_Checker/raw/main/Follow_Feed_Checker.user.js
// @downloadURL        https://github.com/personwritep/Follow_Feed_Checker/raw/main/Follow_Feed_Checker.user.js
// ==/UserScript==


let path=document.location.pathname;
if(path=='/home'){ // HOMEページで有効
    let mode=0;
    let lock=0;
    let user_id;

    let redo; // インターバル変数
    let setting=[]; // 動作設定の記録配列
    // setting[0] スクリプト名
    // setting[1] フィード初期リスト数
    // setting[2] フィードタイマー更新 ON/OFF
    // setting[3] タイマー更新の繰返し時間
    // setting[4]
    // setting[5] リスト更新直前の最下のリスト番号
    // setting[6] リスト更新直前のページスクロール量
    // setting[7] 既読管理の ON/OFF

    let read_json=localStorage.getItem('followfeed_set'); // ストレージ保存名
    setting=JSON.parse(read_json);
    if(setting==null || setting.length<8){
        setting=['FollowFeedSet',20,1,10,0,0,0,1]; }
    let write_json=JSON.stringify(setting);
    localStorage.setItem('followfeed_set', write_json); // ストレージ保存



    let ffDB=[]; // 閲覧記事のID/チェックフラグの記録配列

    let fread_json=localStorage.getItem('FFDB'); // ストレージ保存名
    ffDB=JSON.parse(fread_json);
    if(ffDB==null){
        ffDB=[[0, 0]]; }
    if(ffDB.length>1){
        list_diet(); }
    fwrite();

    function list_diet(){
        ffDB=ffDB.filter(function(value){
            return value[1]>zone(4); }); } //🔴

    function fwrite(){
        if(setting[7]==1){
            let fwrite_json=JSON.stringify(ffDB);
            localStorage.setItem('FFDB', fwrite_json); }} // ストレージ保存

    function zone(d){ // d日前のタイムスタンプ値を生成
        let time=new Date();
        time.setDate(time.getDate() - d);
        let Y=time.getFullYear();
        let M=time.getMonth()+1;
        let D=time.getDate();
        return 10000*Y + 100*M + D; }




    let retry=0;
    let interval=setInterval(wait_target, 100);
    function wait_target(){
        retry++;
        if(retry>100){ // リトライ制限 100回 10secまで
            clearInterval(interval); }
        let Collection=document.querySelector('.HomeChecklist_Collection');
        if(Collection){
            clearInterval(interval);
            set_checklist(); }}


    function set_checklist(){

        ff_panel();
        ff_setting();
        auto_feed();


        function auto_feed(){
            redo=setInterval(()=>{
                feed(setting[2]); }, setting[3]*60000); // 自動タイマー設定と開始 🔴

            function feed(sw){
                let control_b=document.querySelector('.PcModuleHeader_Control button');
                if(control_b && sw==1){
                    last_item(); // リストのスクロール位置取得 🔵
                    control_b.click();
                    fix_last(); }} // 指定記事までリストを開く 🔵
        } // auto_feed()


        function last_item(){
            let item=document.querySelectorAll('.HomeChecklist_Collection_Item');
            for(let k=item.length-1; k>=0; k--){
                let rect=item[k].getBoundingClientRect();
                if(rect.top<window.innerHeight){
                    setting[5]=k; // 🔵 リストの表示上の末尾を取得
                    setting[6]=parseInt(window.pageYOffset);
                    break; }}
            let write_json=JSON.stringify(setting);
            localStorage.setItem('followfeed_set', write_json); } // ローカルストレージ保存


        function fix_last(){
            let item=document.querySelectorAll('.HomeChecklist_Collection_Item');
            let more_button=document.querySelector('.HomeChecklist .Collection_ReadMore_Button');
            if(more_button){
                if(item.length<setting[5]){ // 指定記事までリストを開く 🔵
                    more_button.click(); }}
            document.documentElement.scrollTop=setting[6]; }


        function slow_more(){
            let more_button=document.querySelector('.HomeChecklist .Collection_ReadMore_Button');
            if(more_button){
                let rect=more_button.getBoundingClientRect();
                let item=document.querySelectorAll('.HomeChecklist_Collection_Item');
                if(rect.top<window.innerHeight && item.length<setting[1]){ // 指定記事数まで 🔴
                    last_item();
                    more_button.click(); }}}


        function top_env(){ // ページ最上部に 戻るボタン・スクロールバー で戻った場合
            if(document.documentElement.scrollTop<100){
                setting[5]=8;
                setting[6]=0;
                let write_json=JSON.stringify(setting);
                localStorage.setItem('followfeed_set', write_json); }} // ローカルストレージ保存



        let target=document.querySelector('.HomeChecklist'); // 監視 target
        let monitor=new MutationObserver(main);
        monitor.observe(target, {childList: true, subtree: true}); // 監視開始

        main();

        function main(){

            fix_last(); // ホームを開いた時の初期リスト表示 🔴

            window.addEventListener('wheel', function(){
                slow_more(); });

            window.addEventListener("scroll", function() {
                top_env(); });

            window.addEventListener("beforeunload", function(){
                setting[5]=8;
                setting[6]=0;
                let write_json=JSON.stringify(setting);
                localStorage.setItem('followfeed_set', write_json); }); // ローカルストレージ保存

            let more_button=document.querySelector('.HomeChecklist .Collection_ReadMore_Button');
            if(more_button){
                more_button.addEventListener('mousedown', function(event){
                    last_item(); }); }


            if(setting[7]==1){
                visit_control(); }

            mode_select();
            checker();

        } // main()



        function visit_control(){
            let hcal=document.querySelectorAll('.HomeChecklist_Article_Link');
            for(let k=0; k<hcal.length; k++){
                let user_href=hcal[k].getAttribute('href');
                let ids=user_href.split('entry-')[1].substring(0, 11);
                if(ids){
                    let id=parseInt(ids);
                    if(list_check(id)==1){
                        hcal[k].classList.add('visit'); // class「visit」を追加
                        hcal[k].classList.remove('vmark'); } // class「vmark」を削除
                    if(list_check(id)==2){
                        hcal[k].classList.add('visit'); // class「visit」を追加
                        hcal[k].classList.add('vmark'); }}} // class「visit」を追加


            for(let k=0; k<hcal.length; k++){
                hcal[k].onmouseup=(event)=>{
                    let href=hcal[k].getAttribute('href');
                    let ids=href.split('entry-')[1].substring(0, 11);
                    if(ids){
                        let id=parseInt(ids);
                        if(list_check(id)!=1 && list_check(id)!=2){
                            if(event.button==2){
                                hcal[k].classList.add('visit'); // class「visit」を追加
                                hcal[k].classList.add('vmark'); // class「vmark」を追加
                                list_add_mark(id); // id と mark の記録
                                fwrite(); }
                            else{
                                hcal[k].classList.add('visit'); // class「visit」を追加
                                list_add(id); // id の記録
                                fwrite(); }}
                        else{
                            if(event.button==2){
                                hcal[k].classList.toggle('vmark'); // class「vmark」を変更
                                list_add_toggle(id); // markフラグの変更
                                fwrite(); }}}}}


            for(let k=0; k<hcal.length; k++){
                hcal[k].oncontextmenu=(event)=>{
                    event.preventDefault(); }}


            function list_add(id){
                ffDB.push([id, zone(0)]); }

            function list_add_mark(id){
                ffDB.push([id, zone(0), 1]); }

            function list_add_toggle(id){
                for(let k=0; k<ffDB.length; k++){
                    if(ffDB[k][0]==id){ // id の登録内容を変更
                        if(ffDB[k].length==3){ // mark あり
                            ffDB[k]=[id, zone(0)]; // markフラグ削除
                            fwrite();
                            break; }
                        else{ // mark なし
                            ffDB[k]=[id, zone(0), 1]; // markフラグ追加
                            fwrite();
                            break; }}}}

            function list_check(entry_id){
                for(let k=0; k<ffDB.length; k++){
                    if(ffDB[k][0]==entry_id){ // id 該当
                        if(ffDB[k].length==3){ // mark あり
                            return 2;
                            break; }
                        else{ // mark なし
                            return 1;
                            break; }}}}

        } // visit_control()



        function mode_select(){
            let control_a=document.querySelector('.PcModuleHeader_Control a');
            control_a.onclick=function(e){
                lock=1; } //「設定」で mode_selectを抑止

            let control_b=document.querySelector('.PcModuleHeader_Control button');
            control_b.onclick=function(e){
                lock=1;
                setTimeout( function(){
                    lock=0; }, 100); } //「フィードを更新」で mode_selectを抑止

            let checklist=document.querySelector('.HomeChecklist');
            let title=checklist.querySelector('.PcModuleHeader');
            let title_label=checklist.querySelector('.PcModuleHeader_Title');
            let title_con=checklist.querySelectorAll('.PcModuleHeader_Control_Link');

            title.style.cursor='pointer';

            title.onclick=function(){
                if(mode==0 && lock==0){
                    mode=1;
                    checklist.style.boxShadow='0 0 0 15px #6292ab inset';
                    title.style.boxShadow='0 -4px 0 10px #6292ab, 0 0 0 20px #6292ab inset';
                    title_label.style.color='#fff';
                    title_con[0].style.background='#fff';
                    title_con[1].style.background='#fff';
                    wide_style();
                    checker();}
                else if(mode==1 && lock==0){
                    mode=0;
                    checklist.style.boxShadow='';
                    title.style.boxShadow='';
                    title_label.style.color='#298538';
                    title_con[0].style.background='';
                    title_con[1].style.background='';
                    wide_style_off();
                    checker(); }}

            let r_column=document.querySelector('.PcLayout_RightColumn');
            let c_style=window.getComputedStyle(r_column);
            let c_width=c_style.getPropertyValue('width');
            let c_item=document.querySelectorAll('.HomeChecklist_Collection_Item:nth-child(odd)');
            function wide_style(){
                if(c_width=='740px'){
                    checklist.style.padding='20px';
                    for(let k=0; k<c_item.length; k++){
                        c_item[k].style.marginRight='24px'; }}}

            function wide_style_off(){
                if(c_width=='740px'){
                    checklist.style.padding='';
                    for(let k=0; k<c_item.length; k++){
                        c_item[k].style.marginRight='64px'; }}}

        } // mode_select()



        function checker(){
            let user_href;

            let item=document.querySelectorAll('.HomeChecklist_Collection_Item');
            for(let k=0; k<item.length; k++){
                select_item(k); }

            function select_item(n){
                if(mode==1){
                    item[n].onclick=function(e){
                        e.preventDefault();
                        user_href=item[n].querySelector('.HomeChecklist_Article_Link').getAttribute('href');
                        user_id=user_href.replace('https://ameblo.jp/', '');
                        let index=user_id.indexOf('/entry');
                        user_id=user_id.substring(0, index);
                        item[n].style.outline='2px solid red';
                        setTimeout( conf, 800);

                        function conf(){
                            item[n].style.outline='';
                            let url_str='https://blog.ameba.jp/ucs/blgfavorite/favoritelist.do?' + user_id;
                            window.open( url_str, '_blank'); }}} // ページ移動
                else if(mode==0){
                    item[n].onclick=function(e){ ; }}}

        } // checker()



        function ff_panel(){
            let help_SVG=
                '<svg class="ff_help" viewBox="0 0 210 220">'+
                '<path d="M89 22C71 25 54 33 41 46C7 81 11 142 50 171C58 177 '+
                '68 182 78 185C90 188 103 189 115 187C126 185 137 181 146 175'+
                'C155 169 163 162 169 153C190 123 189 80 166 52C147 30 118 18'+
                ' 89 22z" style="fill:#000;"></path>'+
                '<path d="M67 77C73 75 78 72 84 70C94 66 114 67 109 83C106 91'+
                ' 98 95 93 101C86 109 83 116 83 126L111 126C112 114 122 108 1'+
                '29 100C137 90 141 76 135 64C127 45 101 45 84 48C80 49 71 50 '+
                '68 54C67 56 67 59 67 61L67 77M85 143L85 166L110 166L110 143L'+
                '85 143z" style="fill:#fff;"></path>'+
                '</svg>';

            let panel=
                '<div id="ff_panel">'+
                '<input id="ff_close" type="submit" value="✖">'+
                '<span>　フィードの初期リスト数 </span>'+
                '<input id="list_open" type="number" value="20" min="10" step="10">　　'+
                '<label><input id="ff_timer" type="checkbox"> タイマー更新</label>　'+
                '<div id="ref_set"><span>更新間隔 </span>'+
                '<input id="ref_setter" type="number" value="10" min="1" max="30" step="1">'+
                '<span> 分　　</span></div>'+
                '<label><input id="ff_visit" type="checkbox"> 既読マーク</label> '+
                '<div id="visit_data"><span id="mark_count"></span>件</div>'+
                help_SVG+

                '<style>#ff_panel { position: fixed; top: 8px; left: calc(50% - 532px); '+
                'font: bold 16px/24px Meiryo; color: #666; background: #fff; white-space: nowrap; '+
                'width: auto; height: 30px; padding: 7px 60px 4px 20px; border: 1px solid #20d6c5; '+
                'box-shadow: 4px 6px 8px rgb(0, 0, 0, .1); z-index: 10; display: none; } '+
                '@media screen and (max-width: 1140px){ #ff_panel { left: 28px; }} '+
                '#ff_close { padding: 3px 2px 1px; } '+
                '#list_open, #ref_setter { width: 50px; height: 18px; padding: 4px 2px 1px; '+
                'text-align: center; } '+
                '#list_open::-webkit-inner-spin-button, #ref_setter::-webkit-inner-spin-button { '+
                'height: 17px; } '+
                '#ref_set, #visit_data, #mark_count { display: inline-block; } '+
                '#mark_count { font-weight: normal; color: #000; margin: 0 6px; '+
                'padding: 1px 6px 0; border: 1px solid #777; border-radius: 2px; } '+
                '.ff_help { position: absolute; top: 9px; right: 12px; width: 24px; height: 24px; '+
                'cursor: pointer; } '+
                '.PcHeader_Logo img { outline: 1px solid #20d6c5; outline-offset: 3px; } '+

                //「:visited」リンク色の補償スタイル
                '.HomeChecklist_Article_Link.visit .HomeChecklist_Article_Meta::before { '+
                'background-color: transparent; } '+
                '.HomeChecklist_Article_Link.visit .HomeChecklist_Article_Unread { '+
                'background-color: transparent; } '+
                '.HomeChecklist_Article_Link.vmark .HomeChecklist_Article_Meta::before { '+
                'background-color: #2196f3 !important; } '+
                '.HomeChecklist_Article_Link.vmark .HomeChecklist_Article_Unread { '+
                'background-color: #2196f3 !important; } '+
                '.HomeChecklist_Article_Link.visit .HomeChecklist_Article_Title { '+
                'color: #689cb5; } '+
                '</style></div>';

            if(!document.querySelector('#ff_panel')){
                document.body.insertAdjacentHTML('beforeend', panel); }

        } //ff_panel()



        function ff_setting(){
            let pc_logo=document.querySelector('h1.PcHeader_Logo');
            let ff_panel=document.querySelector('#ff_panel');
            if(pc_logo && ff_panel){
                pc_logo.onclick=(event)=>{
                    event.preventDefault();
                    ff_panel.style.display='block';


                    let ff_close=document.querySelector('#ff_close');
                    ff_close.onclick=(event)=>{
                        event.stopImmediatePropagation();
                        window.location.reload(); }


                    let list_open=document.querySelector('#list_open');
                    list_open.value=setting[1];
                    list_open.onchange=()=>{
                        setting[1]=parseFloat(list_open.value);
                        let write_json=JSON.stringify(setting);
                        localStorage.setItem('followfeed_set', write_json); } // ストレージ保存


                    let ff_timer=document.querySelector('#ff_timer');
                    let ref_set=document.querySelector('#ref_set');
                    let ref_setter=document.querySelector('#ref_setter');
                    if(setting[2]==1){
                        ff_timer.checked=true;
                        ref_set.style.opacity=1;
                        ref_setter.disabled=false; }
                    else{
                        ff_timer.checked=false;
                        ref_set.style.opacity=0.5;
                        ref_setter.disabled=true; }

                    ff_timer.onchange=()=>{
                        if(ff_timer.checked){
                            setting[2]=1;
                            ref_set.style.opacity=1;
                            ref_setter.disabled=false; }
                        else{
                            setting[2]=0;
                            ref_set.style.opacity=0.5;
                            ref_setter.disabled=true; }
                        let write_json=JSON.stringify(setting);
                        localStorage.setItem('followfeed_set', write_json); } // ストレージ保存


                    ref_setter=document.querySelector('#ref_setter');
                    ref_setter.value=setting[3];
                    ref_setter.onchange=()=>{
                        if(parseFloat(ref_setter.value)>=0.1){
                            setting[3]=parseFloat(ref_setter.value); }
                        else{
                            setting[3]=1; }
                        let write_json=JSON.stringify(setting);
                        localStorage.setItem('followfeed_set', write_json); } // ストレージ保存


                    let ff_visit=document.querySelector('#ff_visit');
                    let visit_data=document.querySelector('#visit_data');
                    let mark_count=document.querySelector('#mark_count');
                    if(setting[7]==1){
                        ff_visit.checked=true;
                        visit_data.style.opacity=1;
                        mark_count.textContent=ffDB.length; }
                    else{
                        ff_visit.checked=false;
                        visit_data.style.opacity=0.5;
                        mark_count.textContent='0'; }

                    ff_visit.onchange=()=>{
                        if(ff_visit.checked){
                            setting[7]=1;
                            visit_data.style.opacity=1;
                            ffDB=[[0, 0]];
                            fwrite();
                            mark_count.textContent='0'; }
                        else{
                            setting[7]=0;
                            visit_data.style.opacity=0.5;
                            localStorage.removeItem ('FFDB');
                            mark_count.textContent='0'; }

                        let write_json=JSON.stringify(setting);
                        localStorage.setItem('followfeed_set', write_json); } // ストレージ保存


                    let ff_help=document.querySelector('.ff_help');
                    if(ff_help){
                        ff_help.onclick=()=>{
                            let url='https://ameblo.jp/personwritep/entry-12796420579.html'
                            window.open(url, '_blank'); }}

                }}} // ff_setting()

    } // set_checklist()

} // HOMEページで有効




if(path.includes('blgfavorite')){ // フォロー管理ページで有効
    let user_id;
    let win_url;

    let target=document.querySelector('body'); // 監視 target
    let monitor=new MutationObserver(table_view);
    monitor.observe(target, {childList: true, subtree: true}); // 監視開始

    function table_view(){ // HOMEから遷移して来た最初の管理画面でのみ動作する
        let tr_href=[];
        let find=0;

        win_url=window.location.search.substring(1,window.location.search.length);

        if(win_url !='' && win_url.indexOf('pageID') ==-1){ // URLにuser_idが有る場合
            user_id=win_url;
            sessionStorage.setItem('followfeedcheck_id', user_id); // セッションストレージ名

            let table_tr=document.querySelectorAll('.tableList tbody tr');
            for(let k=0; k<table_tr.length; k++){
                tr_href[k]=table_tr[k].querySelector('td.title a').getAttribute('href');
                if(tr_href[k].indexOf(user_id) !=-1){
                    find=1;
                    table_tr[k].style.outline='2px solid red';
                    table_tr[k].scrollIntoView({block: 'center'});
                    return; }} // 検索処理を終了

            if(find==0){ // user_idが見つからないと2ページへ移動
                let pager=document.querySelector('.pagingArea');
                let end=document.querySelector('.pagingArea .disabled.next');
                if(!end && pager){ // ページング末尾で無ければ2ページへ
                    let url_str='https://blog.ameba.jp/ucs/blgfavorite/favoritelist.do?pageID=2&More';
                    window.open( url_str, '_self'); }}} // URLにuser_idが有る場合

        else if(win_url.indexOf('&More') !=-1){ // URLに&Moreが有る場合のみ
            user_id=sessionStorage.getItem('followfeedcheck_id'); // &Moreページで再読込み

            let table_tr=document.querySelectorAll('.tableList tbody tr');
            for(let k=0; k<table_tr.length; k++){
                tr_href[k]=table_tr[k].querySelector('td.title a').getAttribute('href');
                if(tr_href[k].indexOf(user_id) !=-1){
                    find=1;
                    table_tr[k].style.outline='2px solid red';
                    table_tr[k].scrollIntoView({block: 'center'});
                    return; }} // 検索処理を終了

            if(find==0){ // user_idが見つからないと次ページへ移動
                let end=document.querySelector('.pagingArea .disabled.next');
                if(!end){ // ページング末尾で無ければ次ページへ
                    let page_n=win_url.replace(/[^0-9]/g, '');
                    page_n=parseInt(page_n, 10) +1;
                    let url_str=['https://blog.ameba.jp/ucs/blgfavorite/favoritelist.do?pageID=',
                                 + page_n + '&More'].join('');
                    window.open( url_str, '_self'); }}}

        else{ ; } //  HOMEからの遷移ではなく、単独でフォロー管理を開いた場合

    } // table_view()

} // フォロー管理ページで有効




if(path=='/ucs/top.do'){ // 管理トップ で実行
    let style=
        '<style class="ff_link">'+
        '.user__followInfo { cursor: pointer; border-radius: 4px; } '+
        '.user__followInfo:hover { outline: 1px solid #2196f3; background: #f7fbfb; } '+
        '</style>';

    if(!document.querySelector('.ff_link')){
        document.body.insertAdjacentHTML('beforeend', style); }

    let followinfo=document.querySelector('#contents .user__followInfo');
    if(followinfo){
        followinfo.onclick=()=>{
            location.href='https://blog.ameba.jp/ucs/reader/readerlist.do'; }}


    let f_memo; // フォロワー数の記録
    f_memo=localStorage.getItem('follower_memo'); // ローカルストレージ保存名
    if(f_memo==null){
        f_memo=0; }
    localStorage.setItem('follower_memo', f_memo); // ローカルストレージ保存


    if(followinfo){
        let fnum=followinfo.querySelector('.user__followNumber');
        let now_fnum; // 現在のフォロワー数
        if(fnum){
            now_fnum=parseInt(fnum.textContent, 10); // 更新されたフォロワー数
            if(f_memo!=now_fnum){
                fnum.style.color='red';
                followinfo.style.background='#aaead6';

                if(f_memo<now_fnum){
                    fnum.textContent=fnum.textContent+"▲"; }
                else if(f_memo>now_fnum){
                    fnum.textContent=fnum.textContent+"▼"; }

                setTimeout(()=>{
                    localStorage.setItem('follower_memo', now_fnum); // ローカルストレージ保存
                }, 1000); }}}

} // 管理トップ で実行
