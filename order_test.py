from bitoproClient.bitopro_restful_client import BitoproRestfulClient
import os
import json
import dotenv

dotenv.load_dotenv()

# 替換為你自己的 API Key 與 Secret
api_key = os.getenv("BITOPRO_API_KEY")
api_secret = os.getenv("BITOPRO_API_SECRET")

client = BitoproRestfulClient(api_key, api_secret)

# 查詢支援的交易幣別
currencies = client.get_currencies()

trande_pairs = client.get_trading_pairs()

# 查詢交易對的價格
# pairs_price = client.get_tickers(pair="ETH_USDT")

# 查詢交易對的成交紀錄
# pairs_trade = client.get_trades(pair="ETH_TWD")

# 查詢帳戶餘額
# balance = client.get_account_balance()

# balance_dict = {}
# for currency in balance["data"]:
#     if currency["available"] != "0":
#         if "balance" not in balance_dict:
#             balance_dict["balance"] = {}
#         balance_dict["balance"][currency["currency"]] = currency["available"]

# with open("balance.json", "w") as f:
#     json.dump(balance_dict, f, indent=4)

# 查詢歷史加值紀錄
# history_deposit = client.get_deposit_history(currency="TWD")

# print(history_deposit)

