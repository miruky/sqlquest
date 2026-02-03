export interface Quest {
  id: string;
  stage: string;
  title: string;
  question: string;
  // trueなら行の並び順も判定に含める(ORDER BYが課題の一部のとき)
  ordered: boolean;
  hint: string;
  solution: string;
}

export const quests: Quest[] = [
  {
    id: 'all-products',
    stage: '第1章 はじめてのSELECT',
    title: '商品台帳を開く',
    question: 'products テーブルの全列・全行を取り出してください。まずは台帳の全体を眺めます。',
    ordered: false,
    hint: 'SELECT * FROM テーブル名; が基本形です。',
    solution: `SELECT * FROM products;`,
  },
  {
    id: 'name-and-price',
    stage: '第1章 はじめてのSELECT',
    title: '値札だけの一覧',
    question: 'products から商品名(name)と価格(price)の2列だけを取り出してください。',
    ordered: false,
    hint: '* の代わりに列名をカンマで並べます。',
    solution: `SELECT name, price FROM products;`,
  },
  {
    id: 'under-500',
    stage: '第1章 はじめてのSELECT',
    title: 'ワンコインで買えるもの',
    question: '価格が500円未満の商品の name と price を取り出してください。',
    ordered: false,
    hint: 'WHERE句で行を絞り込みます。「未満」は < です。',
    solution: `SELECT name, price FROM products WHERE price < 500;`,
  },
  {
    id: 'sold-out',
    stage: '第1章 はじめてのSELECT',
    title: '売り切れの捜索',
    question: '在庫(stock)が0の商品の name を突き止めてください。',
    ordered: false,
    hint: '等しいかどうかは = で比べます。',
    solution: `SELECT name FROM products WHERE stock = 0;`,
  },
  {
    id: 'top5-expensive',
    stage: '第2章 並べ替えと件数',
    title: '高級品トップ5',
    question:
      '価格の高い順に商品を並べ、上位5件の name と price を取り出してください。この問題は並び順も採点されます。',
    ordered: true,
    hint: 'ORDER BY price DESC で降順に並べ、LIMITで件数を絞ります。',
    solution: `SELECT name, price FROM products ORDER BY price DESC LIMIT 5;`,
  },
  {
    id: 'distinct-categories',
    stage: '第2章 並べ替えと件数',
    title: '商店街の顔ぶれ',
    question: 'shops の category を、重複を除いて取り出してください。',
    ordered: false,
    hint: 'SELECT DISTINCT で重複行を1つにまとめられます。',
    solution: `SELECT DISTINCT category FROM shops;`,
  },
  {
    id: 'count-and-avg',
    stage: '第3章 集計',
    title: '台帳のサマリー',
    question:
      '商品の総数と、価格の平均(小数第1位に丸める)を1行で出してください。丸めには ROUND(値, 1) を使います。',
    ordered: false,
    hint: 'COUNT(*) と ROUND(AVG(price), 1) を同じSELECTに並べます。',
    solution: `SELECT COUNT(*), ROUND(AVG(price), 1) FROM products;`,
  },
  {
    id: 'count-by-shop',
    stage: '第3章 集計',
    title: '店ごとの品ぞろえ',
    question: '店(shop_id)ごとの商品数を出してください。shop_id と件数の2列です。',
    ordered: false,
    hint: 'GROUP BY shop_id でグループ化し、COUNT(*) で数えます。',
    solution: `SELECT shop_id, COUNT(*) FROM products GROUP BY shop_id;`,
  },
  {
    id: 'having-avg-800',
    stage: '第3章 集計',
    title: '高級店の見極め',
    question:
      '商品の平均価格が800円以上の店を探してください。shop_id と、小数第1位に丸めた平均価格の2列です。',
    ordered: false,
    hint: 'グループ化した後の絞り込みはWHEREではなくHAVINGを使います。',
    solution: `SELECT shop_id, ROUND(AVG(price), 1) FROM products GROUP BY shop_id HAVING AVG(price) >= 800;`,
  },
  {
    id: 'join-shop-name',
    stage: '第4章 テーブルの結合',
    title: 'どこの店の品物か',
    question:
      'すべての商品について、商品名と売っている店の名前を並べてください。products と shops の2列です。',
    ordered: false,
    hint: 'JOIN shops ON products.shop_id = shops.id で結合します。',
    solution: `SELECT products.name, shops.name FROM products JOIN shops ON products.shop_id = shops.id;`,
  },
  {
    id: 'top3-sales',
    stage: '第4章 テーブルの結合',
    title: '売上金額トップ3',
    question:
      '商品ごとの売上金額(数量×価格の合計)を計算し、上位3件の商品名と売上金額を出してください。並び順も採点されます。',
    ordered: true,
    hint: 'order_items と products を結合し、SUM(quantity * price) をGROUP BYと組み合わせます。',
    solution: `SELECT products.name, SUM(order_items.quantity * products.price) AS sales
FROM order_items
JOIN products ON order_items.product_id = products.id
GROUP BY products.id
ORDER BY sales DESC
LIMIT 3;`,
  },
  {
    id: 'never-ordered',
    stage: '第4章 テーブルの結合',
    title: '一度も売れていない商品',
    question: 'これまでに一度も注文されていない商品の name を突き止めてください。',
    ordered: false,
    hint: 'NOT IN (SELECT product_id FROM order_items) のようなサブクエリが使えます。',
    solution: `SELECT name FROM products WHERE id NOT IN (SELECT product_id FROM order_items);`,
  },
  {
    id: 'district-stats',
    stage: '第5章 ひとひねり',
    title: '地区ごとの顧客像',
    question:
      '地区(district)ごとに、顧客の人数と、最も若い顧客の生まれ年を出してください。3列です。',
    ordered: false,
    hint: '「最も若い」は生まれ年が最大ということなので、MAX(birth_year) です。',
    solution: `SELECT district, COUNT(*), MAX(birth_year) FROM customers GROUP BY district;`,
  },
  {
    id: 'max-per-category',
    stage: '第5章 ひとひねり',
    title: 'カテゴリの王者',
    question: '店のカテゴリごとに、最も高い商品を探してください。カテゴリ・商品名・価格の3列です。',
    ordered: false,
    hint: '相関サブクエリで「同じカテゴリ内の最高価格と等しい」商品を選びます。',
    solution: `SELECT shops.category, products.name, products.price
FROM products
JOIN shops ON products.shop_id = shops.id
WHERE products.price = (
  SELECT MAX(p2.price)
  FROM products p2
  JOIN shops s2 ON p2.shop_id = s2.id
  WHERE s2.category = shops.category
);`,
  },
];

export const stages: string[] = [...new Set(quests.map((quest) => quest.stage))];

export function questById(id: string): Quest | undefined {
  return quests.find((quest) => quest.id === id);
}
