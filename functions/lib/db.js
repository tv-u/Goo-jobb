export async function exec(db,sql,params=[]){return db.prepare(sql).bind(...params).run()}
export async function first(db,sql,params=[]){return db.prepare(sql).bind(...params).first()}
export async function all(db,sql,params=[]){return (await db.prepare(sql).bind(...params).all()).results||[]}
export async function batch(db,statements){return db.batch(statements)}
