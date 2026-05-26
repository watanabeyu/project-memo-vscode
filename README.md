* vscodeのextension
* gitに共有するまでもない、READEMEに載せるまででもない、READMEに詳細な手順が載っているけど自分としては簡易的な感じで見れる方がいいなど
* こういったメモをPCの所定のフォルダ以下でまとめて管理するためのextension
* 基本的にはgithubベースでの管理
* {org}/{repo}/memo.md
  * デフォルト的なのがmemo.mdで良いのかどうか
  * 1プロジェクトに複数メモがあることもある
    * 全般的なメモ、環境準備の方法、MTG中のメモ、デバッグの手順など
    * 人によって粒度が変わる
* ActivityBarのアイコンをタップしたらサイドバーが表示される
  * サイドバーのパネルに表示される内容
    * Project memo
      * memo.md
      * hoge.md
      * ...
    * All memo
      * ProjectA/
        * memo.md
        * foo.md
        * bar.md
      * ProjectB/
      * ...
* OUTPUTなどのように下パネルにmarkdownのものが表示することが出来る
  * ここは将来的なもので今は必要無し