export async function render(func: (ctx) => IterableIterator<any>, ctx): Promise<string[]> {
    let sb = [];
    let res = func(ctx);
    for (let item of res) {
        sb.push(item);
        //console.log(item);
    }
    let sb2 = []
    let i = 0;
    for (let item of sb) {
        //console.log(i, item);
        sb2.push(await item);
        i++;
    }
    return sb2;
}