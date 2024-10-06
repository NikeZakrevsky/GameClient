export let bowTexture, bowAltTexture, shadowTexture, arrowTexture, bodyTexture, treeTexture;

export async function loadAssets() {
    await PIXI.Assets.load([
        'assets/images/player.png',
        'assets/images/arrow.png',
        'assets/images/shadow.png',
        'assets/images/bow.png',
        'assets/images/bow_alt.png',
        'assets/images/tree.png'
    ]);

    bowTexture = PIXI.Texture.from('assets/images/bow.png');
    bowAltTexture = PIXI.Texture.from('assets/images/bow_alt.png');
    shadowTexture = PIXI.Texture.from('assets/images/shadow.png');
    arrowTexture = PIXI.Texture.from('assets/images/arrow.png');
    bodyTexture = PIXI.Texture.from('assets/images/player.png');
    treeTexture = PIXI.Texture.from('assets/images/tree.png');
    
    return { bowTexture, bowAltTexture, shadowTexture, arrowTexture, bodyTexture, treeTexture };
}
