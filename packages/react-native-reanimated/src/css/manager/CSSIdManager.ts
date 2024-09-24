// CSSIdManager singleton

export default class CSSIdManager {
  private static _instance: CSSIdManager | null = null;
  private _id: number = 0;

  // eslint-disable-next-line no-useless-constructor
  private constructor() {}

  public static getInstance(): CSSIdManager {
    if (this._instance === null) {
      this._instance = new CSSIdManager();
    }
    return this._instance;
  }

  public getId(): number {
    return this._id++;
  }
}
