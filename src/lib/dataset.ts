// 舞台となる「やまびこ商店街」のデータベース。判定のたびに新しいDBへ流し込むため、
// ユーザーがDROPやUPDATEを実行しても次の実行には影響しない。

export const DATASET_SQL = `
CREATE TABLE shops (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  founded_year INTEGER NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  birth_year INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  ordered_on TEXT NOT NULL
);

CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO shops VALUES
  (1, '喫茶こもれび', 'カフェ', 1998),
  (2, '和菓子処ゆずき', '和菓子', 1975),
  (3, 'ベーカリーつむぎ', 'パン', 2010),
  (4, '八百屋たけだ', '青果', 1962),
  (5, '雑貨アオバ', '雑貨', 2015),
  (6, '書店ふくろう', '書籍', 1988);

INSERT INTO products VALUES
  (1, 1, 'ブレンドコーヒー', 480, 30),
  (2, 1, 'カフェラテ', 540, 25),
  (3, 1, 'レアチーズケーキ', 520, 8),
  (4, 2, '豆大福', 180, 40),
  (5, 2, '栗ようかん', 350, 12),
  (6, 2, '抹茶もなか', 220, 0),
  (7, 3, 'クロワッサン', 240, 20),
  (8, 3, '山食パン', 380, 15),
  (9, 3, '明太フランス', 320, 6),
  (10, 4, '旬の野菜セット', 980, 10),
  (11, 4, 'りんご三兄弟', 450, 18),
  (12, 4, '朝採れトマト', 300, 25),
  (13, 5, '琺瑯マグカップ', 1650, 7),
  (14, 5, '文鳥の箸置き', 880, 14),
  (15, 5, '帆布トートバッグ', 2400, 5),
  (16, 6, '文庫 星の地図', 770, 9),
  (17, 6, '図鑑 街路樹の世界', 1980, 4),
  (18, 6, '方眼ノート', 420, 30);

INSERT INTO customers VALUES
  (1, '青木はるか', '中央', 1990),
  (2, '石田蓮', '川沿い', 1985),
  (3, '上野さくら', '丘の上', 2001),
  (4, '江口大和', '中央', 1978),
  (5, '小川美月', '川沿い', 1995),
  (6, '加藤悠真', '丘の上', 1969),
  (7, '木村芽衣', '中央', 2003),
  (8, '黒田陽菜', '川沿い', 1988),
  (9, '小林快', '丘の上', 1999),
  (10, '斎藤つばさ', '中央', 1992);

INSERT INTO orders VALUES
  (1, 1, '2026-04-03'),
  (2, 2, '2026-04-05'),
  (3, 3, '2026-04-09'),
  (4, 4, '2026-04-12'),
  (5, 5, '2026-04-15'),
  (6, 6, '2026-04-18'),
  (7, 8, '2026-04-21'),
  (8, 9, '2026-04-24'),
  (9, 10, '2026-04-28'),
  (10, 1, '2026-05-02'),
  (11, 2, '2026-05-05'),
  (12, 4, '2026-05-08'),
  (13, 5, '2026-05-11'),
  (14, 8, '2026-05-14'),
  (15, 10, '2026-05-17'),
  (16, 3, '2026-05-20'),
  (17, 9, '2026-05-23'),
  (18, 1, '2026-05-27'),
  (19, 4, '2026-05-30'),
  (20, 10, '2026-06-02'),
  (21, 2, '2026-06-04'),
  (22, 5, '2026-06-06'),
  (23, 8, '2026-06-08'),
  (24, 1, '2026-06-10');

INSERT INTO order_items VALUES
  (1, 1, 2), (1, 3, 1),
  (2, 4, 3),
  (3, 16, 1), (3, 18, 2),
  (4, 10, 1), (4, 12, 2),
  (5, 7, 2), (5, 8, 1),
  (6, 5, 1), (6, 4, 2),
  (7, 2, 1), (7, 3, 1),
  (8, 11, 1),
  (9, 13, 1), (9, 18, 1),
  (10, 1, 1), (10, 7, 1),
  (11, 12, 3),
  (12, 10, 2),
  (13, 8, 2), (13, 9, 1),
  (14, 14, 2),
  (15, 16, 2),
  (16, 4, 4),
  (17, 1, 2), (17, 2, 2),
  (18, 18, 3), (18, 16, 1),
  (19, 12, 2), (19, 11, 2),
  (20, 7, 3),
  (21, 5, 2),
  (22, 9, 2), (22, 8, 1),
  (23, 14, 1), (23, 13, 1),
  (24, 1, 2), (24, 4, 1), (24, 18, 1);
`;

// スキーマ一覧の表示用。テーブルと役割の対応はUIの右ペインに出す。
export const TABLE_NOTES: { name: string; note: string }[] = [
  { name: 'shops', note: '商店街の店。カテゴリと創業年を持つ' },
  { name: 'products', note: '各店の商品。価格と在庫数を持つ' },
  { name: 'customers', note: '顧客。住んでいる地区と生まれ年を持つ' },
  { name: 'orders', note: '注文。誰がいつ注文したか' },
  { name: 'order_items', note: '注文の明細。商品と数量' },
];
