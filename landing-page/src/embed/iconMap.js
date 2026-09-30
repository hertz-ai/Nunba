/**
 * iconMap — the curated icon set ServerDrivenUI may resolve in the embed.
 *
 * ServerDrivenUI resolves icon names with `import * as MuiIcons from
 * '@mui/icons-material'` + a dynamic lookup, which defeats tree-shaking and
 * would put ~2,000 icons into the embed bundle.  The embed build
 * (vite.embed.config.mjs) aliases that exact bare specifier to this module,
 * so ServerDrivenUI keeps its code unchanged and an unknown name falls back
 * to HelpOutline exactly as in the app.  Add a name here when a welcome or
 * agent layout needs it.
 */

export {default as AddShoppingCart} from '@mui/icons-material/AddShoppingCart';
export {default as AutoAwesome} from '@mui/icons-material/AutoAwesome';
export {default as Campaign} from '@mui/icons-material/Campaign';
export {default as CheckCircle} from '@mui/icons-material/CheckCircle';
export {default as HelpOutline} from '@mui/icons-material/HelpOutline';
export {default as Inventory2} from '@mui/icons-material/Inventory2';
export {default as LocalOffer} from '@mui/icons-material/LocalOffer';
export {default as LocalShipping} from '@mui/icons-material/LocalShipping';
export {default as Mic} from '@mui/icons-material/Mic';
export {default as Payments} from '@mui/icons-material/Payments';
export {default as Search} from '@mui/icons-material/Search';
export {default as ShoppingCart} from '@mui/icons-material/ShoppingCart';
export {default as Storefront} from '@mui/icons-material/Storefront';
