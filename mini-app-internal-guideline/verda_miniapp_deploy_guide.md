# Verda 部署 Mini App 前後端＋公司 OpenAI API — 一頁指南

> **對象**：LINE 職員，要在 **公司內部 Verda** 部署 **Mini App** 的 **前端／後端**，且後端需呼叫 **公司契約／付費體系下的 OpenAI API**。  
> **資料來源**：Confluence（Verda、lyai）、內部搜尋摘錄；**不取代**官方文件與各產品最新政策。  
> **官方入口**：Verda `https://verda-docs.linecorp.com/`；OpenAI 內規總覽見下方連結。

---

## 一、先決：環境與專案

| 項目 | 說明 |
|------|------|
| **Verda 是什麼** | LINE 內部 **私有雲**（IaaS／PaaS）：VM、VKS、App Runner、DNS、LB、託管 DB、VOS 等。 |
| **登入** | **LIAM + OKTA SSO**（員工編號或信箱）。Prod：`https://verda.linecorp.com/`；Dev：`https://verda-dev.linecorp.com/`。 |
| **專案（Project）** | 資源以 **專案**為單位；須加入專案並具備各產品所需 **角色**（例如建 VM 常需 **Server Admin**）。 |
| **Dev vs Prod** | **Prod**：正式對外網路。**Dev**：開發網路；與 Prod 之間有 **Network ACL** 等隔離。Mini App 開發／驗證可優先 **Dev**；上線前再確認 **Prod** 與合規。 |

**Mini App 實務提醒**（非 Verda 專屬，但與部署有關）：前端需 **HTTPS**、後端 API 網域需符合 **LIFF／Endpoint 設定**；CORS、環境變數中的 **API Base URL** 請依各環境分開設定。細節以 **LINE Mini App／LIFF 官方文件** 與你部門規範為準。

---

## 二、前端怎麼放在 Verda？

常見為 **Vue／React 等建置後的靜態檔**，或需 **Node 提供的 SSR**（依架構而定）。

| 方式 | 說明 |
|------|------|
| **Verda App Runner** | 與內部範例（如 AVA UI）相同：可部署 **容器** 或 **原始碼**。靜態站若用 nginx／Node 包一層，多走 **Dockerfile → LINE Harbor**（**App Runner 容器映像須符合 Harbor 流程**，非任意 Docker Hub 直接拉）。 |
| **VOS + CDN** | 純靜態可評估 **Verda Object Storage（S3 相容）** 上傳建置產物，搭配 **Verda CDN／DNS**（見 Verda 官方 **VOS／CDN** 文件）。 |

**文件**：App Runner Overview — `https://verda-docs.linecorp.com/compute/apprunner/overview/`  
Quick Start（Source／Container）— 同站 **apprunner/quickstart** 路徑。

---

## 三、後端（Node.js REST 等）怎麼放在 Verda？

| 方式 | 說明 |
|------|------|
| **App Runner** | 最省事：**託管容器**，不必自建 K8s。映像須 **Harbor**；CI 可接 Jenkins／GHA 等（見官方 CI 說明）。 |
| **VM（Verda Server）** | 需 **Poseidon／Gateway** 等 LINE 共通連線流程；適合要完整 OS 控制或既有 **PMC／Ansible** 流程。 |
| **VKS** | 已有 K8s 編排需求時；需 **cluster quota**（常透過 `#ext-help-vks` 等申請）。 |

**是否用 Docker？**  
走 **App Runner 容器路線** → 實務上 **會用 Docker 建映像** 再推 Harbor。  
走 **VM** → 可不裝 Docker，直接在 VM 跑 Node；若要環境一致仍可用容器。

**IaC 參考**：內部有 **Terda（Verda Terraform）+ VM + LB** 範例（lysre「API Status」頁）；若你全棧都放 Verda，仍以 **App Runner／VOS** 較常見於內部文件範例。

---

## 四、資料庫（若用 MongoDB）

- **首選**：**Verda MongoDB Service**（託管），於主控台建立 Service／使用者／**DB Access Control**。  
- **Dev**：規格與 shard 數較限，見 **Guide to Developer - Create MongoDB Service (in Verda Dev)**（Confluence `pageId=3615304701`）。  
- **進階（VPC）**：部分區域／型態需 **VPC Network ACL**（例如文件寫 **KKS、Kitakyushu** 等條件）；埠 **20011**（或 cluster **20019**）等請以 **最新 MongoDB Service VPC 文件** 為準：`verda-doc.linecorp.com/database/mongodbservice/...`。

---

## 五、把前後端與 DB 串起來

1. **專案權限**：確認 Verda **專案**內角色足夠。  
2. **DB**：建立 MongoDB（或 MySQL 等）→ 設好 **ACL**；連線字串、帳密放 **Secret／環境變數**，勿進 Git。  
3. **後端**：App Runner／VM／VKS 上設定 **對內／對外 URL**；Mini App 前端 **只打你自己的後端網域**（後端再去打 OpenAI）。  
4. **App Runner ↔ DB**：參考 **App Runner DB ACL**（LAI Tag 等）：  
   `https://verda-doc.linecorp.com/compute/apprunner/specifications/db-acl/`  
5. **對外流量**：多數經 **Verda LB + DNS**；HTTPS／憑證依官方 **LB／DNS** 流程。  
6. **Flava 遷移議題**：若未來跨 **Flava**，DB 與受管 runtime 的 ACL 較複雜；**短期全在 Verda** 時依 Verda 文件即可。

**是否需要像 AWS 一樣設 VPC？**  
不一定。標準 **MongoDB + App Runner Tag ACL** 時可能不必自架 VPC；若產品選型為 **VPC 型 MongoDB**，再依文件設 **VPC ACL**。

**支援**：`#ext-help-verda`、App Runner：`#ext-help-verda-app-runner`（以最新文件為準）。

---

## 六、後端呼叫「公司付費／契約」OpenAI API

### 6.1 原則

- 須使用 **包括契約下核發的 API 金鑰**，並遵守 **生成 AI 利用相談**、**WFPF**、**資訊分類／個資** 等規範。  
- **總覽頁（lyai）**：https://wiki.workers-hub.com/pages/viewpage.action?pageId=267188423  

### 6.2 金鑰類型（先決定你要申請哪一種）

| 類型 | 用途印象 | 申請（lyai） |
|------|----------|----------------|
| **服務 API 金鑰** | 本番／部門負擔費用，與服務代碼、費用管理者綁定 | [服務 API 金鑰申請方法](https://wiki.workers-hub.com/pages/viewpage.action?pageId=199104921) |
| **贊助 API 金鑰** | 技術驗證等；Wiki 為 **Proxy API 金鑰** 形式 | [贊助 API 金鑰申請方法](https://wiki.workers-hub.com/pages/viewpage.action?pageId=199104949) |

**利用指南**：  
服務 — https://wiki.workers-hub.com/pages/viewpage.action?pageId=3276549388  
贊助 — https://wiki.workers-hub.com/pages/viewpage.action?pageId=3276549573  
**FAQ**（費用查詢 Box、Slack 分流）：https://wiki.workers-hub.com/pages/viewpage.action?pageId=3325179964  

### 6.3 服務金鑰：後端怎麼 Call？

- 實作依 OpenAI 官方 Quickstart：`https://platform.openai.com/docs/quickstart`  
- **2025/10/10 起** 新發行的 **Project API Key** 端點：**`https://us.api.openai.com`**（見服務金鑰利用指南表格）。  
- **金鑰**：環境變數／Secret（Verda App Runner 或 VM 上設定），**禁止**寫死於 repo。  
- 問題：**Slack `#pj-users-openai-apikeys`**；可 CC **`ml-openai-apikey-orgid@lycorp.co.jp`**。狀態：**`#z-openai_status_checker`**。  
- 贊助金鑰技術問題：**`#ext-help-genai-gateway`**。

### 6.4 申請順序（服務 API 金鑰常見）

1. **預算**：費用由申請部門負擔。  
2. **生成 AI 利用相談**（多數需 **GENAICONTACT-*** 等 Jira 通過後再申請金鑰）。  
3. **WFPF**：`https://wfpf.workers-hub.com/proposal/20231109095227985051`（須 **PO 或 Unit Lead**；件名含服務名／服務代碼）。  
4. 金鑰於 **WFPF 留言**交付；後端在 **Verda 各環境**注入 Secret。

### 6.5 內部 LiteLLM（可選）

若部門提供 **LiteLLM Proxy**，後端可改打 **內部 Base URL + Virtual Key**，由閘道路由到供應商（不一定直接持 OpenAI Key）。例：  
[LiteLLM Beta - Model API 使用指南](https://wiki.workers-hub.com/pages/viewpage.action?pageId=3815191188)、  
[TWC LiteLLM Overview](https://wiki.workers-hub.com/pages/viewpage.action?pageId=3798994971)。  
**是否採用**依你部門／產品線，須自行確認。

---

## 七、建議實作順序（Checklist）

1. [ ] 確認 **Verda Dev / Prod** 與 Mini App **上線環境**一致策略。  
2. [ ] 建立或加入 **Verda 專案**，角色足夠。  
3. [ ] **生成 AI 利用相談**（若需）→ **WFPF 申請 OpenAI 服務／贊助金鑰** → 金鑰注入後端環境。  
4. [ ] 部署 **後端**（App Runner 或 VM／VKS）→ 僅在此呼叫 OpenAI／LiteLLM，**勿**從瀏覽器直連 OpenAI。  
5. [ ] 部署 **前端**（App Runner 或 VOS+CDN）→ 設定 **後端 Base URL**（Mini App／LIFF 允許的網域）。  
6. [ ] 若有 **MongoDB**（或其他 DB）→ 建服務並設 **ACL** 與 App Runner **DB ACL**（若適用）。  
7. [ ] 設定 **LB／DNS／HTTPS** 與監控；問題依產品洽 **#ext-help-verda** 等。

---

## 八、Confluence 索引（精簡）

### Verda

| 主題 | URL |
|------|-----|
| Getting Started with Verda | https://wiki.workers-hub.com/pages/viewpage.action?pageId=2751295711 |
| Prod vs Dev | https://wiki.workers-hub.com/pages/viewpage.action?pageId=2751295740 |
| AVA Deployment（FE/BE App Runner 範例） | https://wiki.workers-hub.com/pages/viewpage.action?pageId=3790255458 |
| N8N on App Runner（Dockerfile 範例） | https://wiki.workers-hub.com/pages/viewpage.action?pageId=3368172335 |
| MongoDB Dev 建立 | https://wiki.workers-hub.com/pages/viewpage.action?pageId=3615304701 |

### OpenAI（lyai）

| 主題 | URL |
|------|-----|
| OpenAI API 總覽 | https://wiki.workers-hub.com/pages/viewpage.action?pageId=267188423 |
| 服務 API 金鑰申請 | https://wiki.workers-hub.com/pages/viewpage.action?pageId=199104921 |
| 服務 API 金鑰利用指南 | https://wiki.workers-hub.com/pages/viewpage.action?pageId=3276549388 |
| API 金鑰 FAQ | https://wiki.workers-hub.com/pages/viewpage.action?pageId=3325179964 |
| 包括契約 API 金鑰利用概要 | https://wiki.workers-hub.com/pages/viewpage.action?pageId=1180367182 |

---

*本檔為內部文件摘錄與情境整理；實務以 Wiki 最新版、法務／資安／財務與 Mini App 產品規範為準。*