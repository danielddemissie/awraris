export interface PackageJson {
  name: string
  version: string
  description: string
  main?: string
  scripts?: {
    [key: string]: string
  }
  keywords?: string[]
  author?: string
  license?: string
  dependencies?: {
    [key: string]: string
  }
  devDependencies?: {
    [key: string]: string
  }
}
