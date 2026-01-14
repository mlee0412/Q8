/**
 * Finance Hub Types
 *
 * Type definitions for the FinanceHub widget and related features
 */

// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export type AccountType = 'depository' | 'credit' | 'investment' | 'loan' | 'cash' | 'crypto';

export type AccountSubtype =
  | 'checking'
  | 'savings'
  | 'money_market'
  | 'cd'
  | 'credit_card'
  | 'brokerage'
  | '401k'
  | 'ira'
  | 'roth_ira'
  | 'student'
  | 'mortgage'
  | 'auto'
  | 'personal'
  | 'bitcoin'
  | 'ethereum'
  | 'other';

export type TransactionStatus = 'pending' | 'posted' | 'canceled';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export type PaymentChannel = 'online' | 'in_store' | 'other';

// Expanded category mapping with icons
export const CATEGORY_ICONS: Record<string, string> = {
  // Food & Dining
  'Food and Drink': '🍔',
  'Groceries': '🛒',
  'Restaurants': '🍽️',
  'Coffee Shops': '☕',
  'Fast Food': '🍟',
  'Bars & Alcohol': '🍺',
  // Shopping
  'Shopping': '🛍️',
  'Shops': '🛍️',
  'Clothing': '👕',
  'Electronics': '📱',
  'Home Goods': '🏠',
  'Online Shopping': '📦',
  // Transportation
  'Transportation': '🚗',
  'Gas & Fuel': '⛽',
  'Rideshare': '🚕',
  'Public Transit': '🚇',
  'Parking': '🅿️',
  'Auto & Transport': '🚙',
  // Travel
  'Travel': '✈️',
  'Hotels': '🏨',
  'Flights': '✈️',
  'Vacation': '🏖️',
  // Bills & Utilities
  'Bills & Utilities': '📄',
  'Utilities': '💡',
  'Internet': '🌐',
  'Phone': '📞',
  'Cable & TV': '📺',
  'Rent': '🏢',
  'Mortgage': '🏠',
  // Subscriptions & Services
  'Subscriptions': '🔄',
  'Streaming': '📺',
  'Software': '💻',
  'Service': '🔧',
  // Financial
  'Transfer': '💸',
  'Payment': '💳',
  'Bank Fees': '🏦',
  'ATM': '🏧',
  'Tax': '📋',
  'Insurance': '🛡️',
  'Investments': '📈',
  // Income
  'Income': '💰',
  'Salary': '💵',
  'Freelance': '💼',
  'Refund': '↩️',
  'Interest': '📊',
  'Dividends': '💹',
  // Health & Wellness
  'Healthcare': '🏥',
  'Pharmacy': '💊',
  'Doctor': '👨‍⚕️',
  'Dental': '🦷',
  'Fitness': '💪',
  'Gym': '🏋️',
  // Personal
  'Personal Care': '💅',
  'Beauty': '💄',
  'Spa': '🧖',
  // Entertainment
  'Entertainment': '🎬',
  'Recreation': '🎮',
  'Gaming': '🎮',
  'Movies': '🎥',
  'Music': '🎵',
  'Sports': '⚽',
  'Events': '🎟️',
  // Education
  'Education': '📚',
  'Books': '📖',
  'Courses': '🎓',
  // Pets
  'Pets': '🐾',
  'Vet': '🏥',
  // Community & Donations
  'Community': '🏘️',
  'Charity': '❤️',
  'Gifts': '🎁',
  // Other
  'Other': '📦',
  'Uncategorized': '❓',
};

// Merchant keyword to category mapping for auto-categorization
// Keywords are matched case-insensitively against merchantName + description
// More specific/longer keywords should be listed first as they're matched first
export const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  // ========== COFFEE SHOPS ==========
  'starbucks': 'Coffee Shops',
  'dunkin': 'Coffee Shops',
  'peet\'s coffee': 'Coffee Shops',
  'peets coffee': 'Coffee Shops',
  'dutch bros': 'Coffee Shops',
  'philz coffee': 'Coffee Shops',
  'blue bottle': 'Coffee Shops',
  'caribou coffee': 'Coffee Shops',
  'tim hortons': 'Coffee Shops',
  'coffee bean': 'Coffee Shops',
  'espresso': 'Coffee Shops',
  'coffee': 'Coffee Shops',
  'cafe': 'Coffee Shops',
  'caffeine': 'Coffee Shops',
  
  // ========== FAST FOOD ==========
  'mcdonald': 'Fast Food',
  'burger king': 'Fast Food',
  'wendy\'s': 'Fast Food',
  'wendys': 'Fast Food',
  'taco bell': 'Fast Food',
  'chick-fil-a': 'Fast Food',
  'chickfila': 'Fast Food',
  'popeyes': 'Fast Food',
  'kfc': 'Fast Food',
  'kentucky fried': 'Fast Food',
  'five guys': 'Fast Food',
  'in-n-out': 'Fast Food',
  'in n out': 'Fast Food',
  'shake shack': 'Fast Food',
  'whataburger': 'Fast Food',
  'sonic drive': 'Fast Food',
  'jack in the box': 'Fast Food',
  'arby\'s': 'Fast Food',
  'arbys': 'Fast Food',
  'dairy queen': 'Fast Food',
  'culver\'s': 'Fast Food',
  'culvers': 'Fast Food',
  'panda express': 'Fast Food',
  'chipotle': 'Fast Food',
  'qdoba': 'Fast Food',
  'subway': 'Fast Food',
  'jimmy john': 'Fast Food',
  'jersey mike': 'Fast Food',
  'firehouse subs': 'Fast Food',
  'potbelly': 'Fast Food',
  'panera': 'Fast Food',
  'noodles': 'Fast Food',
  'wingstop': 'Fast Food',
  'buffalo wild': 'Fast Food',
  'raising cane': 'Fast Food',
  'zaxby': 'Fast Food',
  'del taco': 'Fast Food',
  'el pollo loco': 'Fast Food',
  'carl\'s jr': 'Fast Food',
  'carls jr': 'Fast Food',
  'hardee': 'Fast Food',
  'checkers': 'Fast Food',
  'rally\'s': 'Fast Food',
  'rallys': 'Fast Food',
  'little caesars': 'Fast Food',
  'domino': 'Fast Food',
  'papa john': 'Fast Food',
  'pizza hut': 'Fast Food',
  
  // ========== RESTAURANTS ==========
  'olive garden': 'Restaurants',
  'applebee': 'Restaurants',
  'chili\'s': 'Restaurants',
  'chilis': 'Restaurants',
  'outback': 'Restaurants',
  'red lobster': 'Restaurants',
  'longhorn': 'Restaurants',
  'texas roadhouse': 'Restaurants',
  'cracker barrel': 'Restaurants',
  'ihop': 'Restaurants',
  'denny\'s': 'Restaurants',
  'dennys': 'Restaurants',
  'waffle house': 'Restaurants',
  'cheesecake factory': 'Restaurants',
  'p.f. chang': 'Restaurants',
  'pf chang': 'Restaurants',
  'benihana': 'Restaurants',
  'ruth\'s chris': 'Restaurants',
  'ruths chris': 'Restaurants',
  'morton\'s': 'Restaurants',
  'mortons': 'Restaurants',
  'steakhouse': 'Restaurants',
  'chophouse': 'Restaurants',
  'sushi': 'Restaurants',
  'ramen': 'Restaurants',
  'pho': 'Restaurants',
  'thai': 'Restaurants',
  'indian': 'Restaurants',
  'chinese': 'Restaurants',
  'mexican': 'Restaurants',
  'italian': 'Restaurants',
  'korean': 'Restaurants',
  'japanese': 'Restaurants',
  'vietnamese': 'Restaurants',
  'mediterranean': 'Restaurants',
  'greek': 'Restaurants',
  'seafood': 'Restaurants',
  'bbq': 'Restaurants',
  'barbecue': 'Restaurants',
  'restaurant': 'Restaurants',
  'grill': 'Restaurants',
  'diner': 'Restaurants',
  'kitchen': 'Restaurants',
  'eatery': 'Restaurants',
  'bistro': 'Restaurants',
  'tavern': 'Restaurants',
  'pizzeria': 'Restaurants',
  'trattoria': 'Restaurants',
  'cantina': 'Restaurants',
  'taqueria': 'Restaurants',
  'bakery': 'Restaurants',
  'deli': 'Restaurants',
  'catering': 'Restaurants',
  
  // ========== FOOD DELIVERY ==========
  'uber eats': 'Food and Drink',
  'ubereats': 'Food and Drink',
  'doordash': 'Food and Drink',
  'grubhub': 'Food and Drink',
  'postmates': 'Food and Drink',
  'seamless': 'Food and Drink',
  'caviar': 'Food and Drink',
  'delivery.com': 'Food and Drink',
  'slice': 'Food and Drink',
  'gopuff': 'Shopping',
  
  // ========== GROCERIES ==========
  'whole foods': 'Groceries',
  'trader joe': 'Groceries',
  'safeway': 'Groceries',
  'kroger': 'Groceries',
  'ralphs': 'Groceries',
  'fred meyer': 'Groceries',
  'publix': 'Groceries',
  'aldi': 'Groceries',
  'lidl': 'Groceries',
  'costco': 'Groceries',
  'sam\'s club': 'Groceries',
  'sams club': 'Groceries',
  'bj\'s': 'Groceries',
  'bjs wholesale': 'Groceries',
  'wegmans': 'Groceries',
  'h-e-b': 'Groceries',
  'heb': 'Groceries',
  'meijer': 'Groceries',
  'winco': 'Groceries',
  'food lion': 'Groceries',
  'stop & shop': 'Groceries',
  'stop and shop': 'Groceries',
  'giant': 'Groceries',
  'giant eagle': 'Groceries',
  'jewel osco': 'Groceries',
  'albertsons': 'Groceries',
  'vons': 'Groceries',
  'pavilions': 'Groceries',
  'shaw\'s': 'Groceries',
  'shaws': 'Groceries',
  'acme': 'Groceries',
  'piggly wiggly': 'Groceries',
  'winn-dixie': 'Groceries',
  'winn dixie': 'Groceries',
  'ingles': 'Groceries',
  'harris teeter': 'Groceries',
  'sprouts': 'Groceries',
  'natural grocers': 'Groceries',
  'fresh market': 'Groceries',
  'lucky\'s': 'Groceries',
  'luckys': 'Groceries',
  'instacart': 'Groceries',
  'shipt': 'Groceries',
  'grocery': 'Groceries',
  'supermarket': 'Groceries',
  'food mart': 'Groceries',
  'foodmart': 'Groceries',
  'market basket': 'Groceries',
  'farmer\'s market': 'Groceries',
  'farmers market': 'Groceries',
  
  // ========== BARS & ALCOHOL ==========
  'total wine': 'Bars & Alcohol',
  'bevmo': 'Bars & Alcohol',
  'abc liquor': 'Bars & Alcohol',
  'liquor store': 'Bars & Alcohol',
  'wine shop': 'Bars & Alcohol',
  'brewery': 'Bars & Alcohol',
  'distillery': 'Bars & Alcohol',
  'winery': 'Bars & Alcohol',
  'taproom': 'Bars & Alcohol',
  'pub': 'Bars & Alcohol',
  'saloon': 'Bars & Alcohol',
  'lounge': 'Bars & Alcohol',
  'nightclub': 'Bars & Alcohol',
  'wine': 'Bars & Alcohol',
  'liquor': 'Bars & Alcohol',
  'spirits': 'Bars & Alcohol',
  'beer': 'Bars & Alcohol',
  'bar ': 'Bars & Alcohol',
  ' bar': 'Bars & Alcohol',
  
  // ========== SHOPPING - GENERAL ==========
  'walmart': 'Shopping',
  'target': 'Shopping',
  'dollar general': 'Shopping',
  'dollar tree': 'Shopping',
  'family dollar': 'Shopping',
  'five below': 'Shopping',
  'big lots': 'Shopping',
  'bed bath': 'Shopping',
  'home depot': 'Shopping',
  'lowe\'s': 'Shopping',
  'lowes': 'Shopping',
  'menards': 'Shopping',
  'ace hardware': 'Shopping',
  'true value': 'Shopping',
  'harbor freight': 'Shopping',
  'ikea': 'Shopping',
  'pottery barn': 'Shopping',
  'crate & barrel': 'Shopping',
  'crate and barrel': 'Shopping',
  'williams sonoma': 'Shopping',
  'pier 1': 'Shopping',
  'homegoods': 'Shopping',
  'at home': 'Shopping',
  'michaels': 'Shopping',
  'joann': 'Shopping',
  'hobby lobby': 'Shopping',
  'staples': 'Shopping',
  'office depot': 'Shopping',
  'officemax': 'Shopping',
  
  // ========== ONLINE SHOPPING ==========
  'amazon': 'Online Shopping',
  'amzn': 'Online Shopping',
  'ebay': 'Online Shopping',
  'etsy': 'Online Shopping',
  'wish.com': 'Online Shopping',
  'aliexpress': 'Online Shopping',
  'shein': 'Online Shopping',
  'temu': 'Online Shopping',
  'wayfair': 'Online Shopping',
  'overstock': 'Online Shopping',
  'newegg': 'Online Shopping',
  'zappos': 'Online Shopping',
  'chewy.com': 'Online Shopping',
  
  // ========== ELECTRONICS ==========
  'best buy': 'Electronics',
  'bestbuy': 'Electronics',
  'apple store': 'Electronics',
  'apple.com': 'Electronics',
  'microsoft store': 'Electronics',
  'samsung': 'Electronics',
  'gamestop': 'Electronics',
  'micro center': 'Electronics',
  'b&h photo': 'Electronics',
  'adorama': 'Electronics',
  'frys': 'Electronics',
  'radioshack': 'Electronics',
  
  // ========== CLOTHING ==========
  'nike': 'Clothing',
  'adidas': 'Clothing',
  'under armour': 'Clothing',
  'lululemon': 'Clothing',
  'athleta': 'Clothing',
  'foot locker': 'Clothing',
  'finish line': 'Clothing',
  'champs': 'Clothing',
  'gap': 'Clothing',
  'old navy': 'Clothing',
  'banana republic': 'Clothing',
  'h&m': 'Clothing',
  'zara': 'Clothing',
  'uniqlo': 'Clothing',
  'forever 21': 'Clothing',
  'express': 'Clothing',
  'american eagle': 'Clothing',
  'aeropostale': 'Clothing',
  'hollister': 'Clothing',
  'abercrombie': 'Clothing',
  'urban outfitters': 'Clothing',
  'anthropologie': 'Clothing',
  'free people': 'Clothing',
  'nordstrom': 'Clothing',
  'macy\'s': 'Clothing',
  'macys': 'Clothing',
  'dillard': 'Clothing',
  'jcpenney': 'Clothing',
  'kohl\'s': 'Clothing',
  'kohls': 'Clothing',
  'ross': 'Clothing',
  'tj maxx': 'Clothing',
  'tjmaxx': 'Clothing',
  'marshalls': 'Clothing',
  'burlington': 'Clothing',
  'saks': 'Clothing',
  'neiman marcus': 'Clothing',
  'bloomingdale': 'Clothing',
  'brooks brothers': 'Clothing',
  'men\'s wearhouse': 'Clothing',
  'mens wearhouse': 'Clothing',
  'jos a bank': 'Clothing',
  'victoria\'s secret': 'Clothing',
  'victorias secret': 'Clothing',
  'bath & body': 'Clothing',
  
  // ========== RIDESHARE & TRANSPORTATION ==========
  'uber trip': 'Rideshare',
  'lyft': 'Rideshare',
  'taxi': 'Rideshare',
  'cab fare': 'Rideshare',
  'yellow cab': 'Rideshare',
  'limousine': 'Rideshare',
  'limo': 'Rideshare',
  'car service': 'Rideshare',
  'shuttle': 'Rideshare',
  
  // ========== GAS & FUEL ==========
  'shell': 'Gas & Fuel',
  'chevron': 'Gas & Fuel',
  'texaco': 'Gas & Fuel',
  'exxon': 'Gas & Fuel',
  'mobil': 'Gas & Fuel',
  'exxonmobil': 'Gas & Fuel',
  'bp': 'Gas & Fuel',
  'arco': 'Gas & Fuel',
  'ampm': 'Gas & Fuel',
  '76': 'Gas & Fuel',
  'conoco': 'Gas & Fuel',
  'phillips 66': 'Gas & Fuel',
  'marathon': 'Gas & Fuel',
  'speedway': 'Gas & Fuel',
  'circle k': 'Gas & Fuel',
  'racetrac': 'Gas & Fuel',
  'quiktrip': 'Gas & Fuel',
  'qt': 'Gas & Fuel',
  'wawa': 'Gas & Fuel',
  'sheetz': 'Gas & Fuel',
  'casey\'s': 'Gas & Fuel',
  'caseys': 'Gas & Fuel',
  'pilot': 'Gas & Fuel',
  'flying j': 'Gas & Fuel',
  'loves': 'Gas & Fuel',
  'ta travel': 'Gas & Fuel',
  'truck stop': 'Gas & Fuel',
  'gas station': 'Gas & Fuel',
  'gasoline': 'Gas & Fuel',
  'petroleum': 'Gas & Fuel',
  'fuel': 'Gas & Fuel',
  'oil change': 'Auto & Transport',
  'jiffy lube': 'Auto & Transport',
  'valvoline': 'Auto & Transport',
  'pep boys': 'Auto & Transport',
  'autozone': 'Auto & Transport',
  'o\'reilly': 'Auto & Transport',
  'oreilly': 'Auto & Transport',
  'advance auto': 'Auto & Transport',
  'napa': 'Auto & Transport',
  'firestone': 'Auto & Transport',
  'goodyear': 'Auto & Transport',
  'discount tire': 'Auto & Transport',
  'tire': 'Auto & Transport',
  'car wash': 'Auto & Transport',
  'carwash': 'Auto & Transport',
  'detailing': 'Auto & Transport',
  
  // ========== PARKING & TOLLS ==========
  'parking': 'Parking',
  'parkwhiz': 'Parking',
  'spothero': 'Parking',
  'parkme': 'Parking',
  'meter': 'Parking',
  'garage': 'Parking',
  'toll': 'Auto & Transport',
  'ezpass': 'Auto & Transport',
  'fastrak': 'Auto & Transport',
  'sunpass': 'Auto & Transport',
  
  // ========== PUBLIC TRANSIT ==========
  'metro': 'Public Transit',
  'mta subway': 'Public Transit',
  'bus': 'Public Transit',
  'train': 'Public Transit',
  'amtrak': 'Public Transit',
  'greyhound': 'Public Transit',
  'megabus': 'Public Transit',
  'flixbus': 'Public Transit',
  'mta': 'Public Transit',
  'bart': 'Public Transit',
  'cta': 'Public Transit',
  'septa': 'Public Transit',
  'wmata': 'Public Transit',
  'transit': 'Public Transit',
  
  // ========== STREAMING ==========
  'netflix': 'Streaming',
  'spotify': 'Streaming',
  'hulu': 'Streaming',
  'disney+': 'Streaming',
  'disney plus': 'Streaming',
  'disneyplus': 'Streaming',
  'hbo max': 'Streaming',
  'hbo': 'Streaming',
  'max.com': 'Streaming',
  'peacock': 'Streaming',
  'paramount+': 'Streaming',
  'paramount plus': 'Streaming',
  'apple tv': 'Streaming',
  'appletv': 'Streaming',
  'apple music': 'Streaming',
  'youtube premium': 'Streaming',
  'youtube music': 'Streaming',
  'youtube tv': 'Streaming',
  'amazon prime': 'Streaming',
  'prime video': 'Streaming',
  'amazon video': 'Streaming',
  'crunchyroll': 'Streaming',
  'funimation': 'Streaming',
  'tidal': 'Streaming',
  'pandora': 'Streaming',
  'deezer': 'Streaming',
  'sling': 'Streaming',
  'fubo': 'Streaming',
  'philo': 'Streaming',
  'discovery+': 'Streaming',
  'espn+': 'Streaming',
  'showtime': 'Streaming',
  'starz': 'Streaming',
  'amc+': 'Streaming',
  'britbox': 'Streaming',
  'acorn': 'Streaming',
  
  // ========== SUBSCRIPTIONS & SOFTWARE ==========
  'audible': 'Subscriptions',
  'kindle': 'Subscriptions',
  'adobe': 'Subscriptions',
  'microsoft 365': 'Subscriptions',
  'office 365': 'Subscriptions',
  'google one': 'Subscriptions',
  'icloud': 'Subscriptions',
  'dropbox': 'Subscriptions',
  'box.com': 'Subscriptions',
  'evernote': 'Subscriptions',
  'notion': 'Subscriptions',
  'slack': 'Subscriptions',
  'zoom': 'Subscriptions',
  'canva': 'Subscriptions',
  'figma': 'Subscriptions',
  'github': 'Subscriptions',
  'linkedin premium': 'Subscriptions',
  'duolingo': 'Subscriptions',
  'headspace': 'Subscriptions',
  'calm': 'Subscriptions',
  'noom': 'Subscriptions',
  'weight watchers': 'Subscriptions',
  'ww': 'Subscriptions',
  'ancestry': 'Subscriptions',
  '23andme': 'Subscriptions',
  'nordvpn': 'Subscriptions',
  'expressvpn': 'Subscriptions',
  'vpn': 'Subscriptions',
  'antivirus': 'Subscriptions',
  'norton': 'Subscriptions',
  'mcafee': 'Subscriptions',
  'lastpass': 'Subscriptions',
  '1password': 'Subscriptions',
  'dashlane': 'Subscriptions',
  
  // ========== PHONE & WIRELESS ==========
  'verizon': 'Phone',
  'at&t': 'Phone',
  'att': 'Phone',
  't-mobile': 'Phone',
  'tmobile': 'Phone',
  'sprint': 'Phone',
  'us cellular': 'Phone',
  'cricket': 'Phone',
  'metro pcs': 'Phone',
  'metropcs': 'Phone',
  'boost mobile': 'Phone',
  'straight talk': 'Phone',
  'mint mobile': 'Phone',
  'visible': 'Phone',
  'google fi': 'Phone',
  'wireless': 'Phone',
  'cellular': 'Phone',
  'mobile phone': 'Phone',
  
  // ========== INTERNET & CABLE ==========
  'comcast': 'Internet',
  'xfinity': 'Internet',
  'spectrum': 'Internet',
  'charter': 'Internet',
  'cox': 'Internet',
  'frontier': 'Internet',
  'centurylink': 'Internet',
  'lumen': 'Internet',
  'optimum': 'Internet',
  'altice': 'Internet',
  'mediacom': 'Internet',
  'wow internet': 'Internet',
  'rcn': 'Internet',
  'fios': 'Internet',
  'fiber': 'Internet',
  'broadband': 'Internet',
  'cable': 'Internet',
  'internet': 'Internet',
  'directv': 'Cable & TV',
  'dish network': 'Cable & TV',
  
  // ========== UTILITIES ==========
  'edison': 'Utilities',
  'pge': 'Utilities',
  'pg&e': 'Utilities',
  'sce': 'Utilities',
  'con edison': 'Utilities',
  'coned': 'Utilities',
  'duke energy': 'Utilities',
  'dominion energy': 'Utilities',
  'xcel energy': 'Utilities',
  'national grid': 'Utilities',
  'entergy': 'Utilities',
  'georgia power': 'Utilities',
  'florida power': 'Utilities',
  'fpl': 'Utilities',
  'electric': 'Utilities',
  'electricity': 'Utilities',
  'power company': 'Utilities',
  'water': 'Utilities',
  'sewer': 'Utilities',
  'sewage': 'Utilities',
  'gas company': 'Utilities',
  'natural gas': 'Utilities',
  'propane': 'Utilities',
  'trash': 'Utilities',
  'waste management': 'Utilities',
  'garbage': 'Utilities',
  'recycling': 'Utilities',
  'utility': 'Utilities',
  
  // ========== RENT & MORTGAGE ==========
  'rent': 'Rent',
  'apartment': 'Rent',
  'lease': 'Rent',
  'landlord': 'Rent',
  'property management': 'Rent',
  'hoa': 'Rent',
  'homeowner': 'Rent',
  'mortgage': 'Mortgage',
  'home loan': 'Mortgage',
  'escrow': 'Mortgage',
  
  // ========== INSURANCE ==========
  'geico': 'Insurance',
  'state farm': 'Insurance',
  'allstate': 'Insurance',
  'progressive': 'Insurance',
  'liberty mutual': 'Insurance',
  'farmers insurance': 'Insurance',
  'nationwide': 'Insurance',
  'usaa': 'Insurance',
  'travelers': 'Insurance',
  'hartford': 'Insurance',
  'metlife': 'Insurance',
  'prudential': 'Insurance',
  'cigna': 'Insurance',
  'aetna': 'Insurance',
  'humana': 'Insurance',
  'unitedhealthcare': 'Insurance',
  'blue cross': 'Insurance',
  'bcbs': 'Insurance',
  'kaiser': 'Insurance',
  'anthem': 'Insurance',
  'aflac': 'Insurance',
  'insurance': 'Insurance',
  'premium': 'Insurance',
  'policy': 'Insurance',
  
  // ========== HEALTHCARE ==========
  'hospital': 'Healthcare',
  'clinic': 'Healthcare',
  'medical center': 'Healthcare',
  'health center': 'Healthcare',
  'urgent care': 'Healthcare',
  'emergency room': 'Healthcare',
  'er visit': 'Healthcare',
  'laboratory': 'Healthcare',
  'lab corp': 'Healthcare',
  'labcorp': 'Healthcare',
  'quest diagnostics': 'Healthcare',
  'x-ray': 'Healthcare',
  'xray': 'Healthcare',
  'mri': 'Healthcare',
  'imaging': 'Healthcare',
  'radiology': 'Healthcare',
  'physical therapy': 'Healthcare',
  'chiropractor': 'Healthcare',
  'chiropractic': 'Healthcare',
  'acupuncture': 'Healthcare',
  'therapist': 'Healthcare',
  'therapy': 'Healthcare',
  'counseling': 'Healthcare',
  'psychiatr': 'Healthcare',
  'psycholog': 'Healthcare',
  'mental health': 'Healthcare',
  'medical': 'Healthcare',
  'healthcare': 'Healthcare',
  'health care': 'Healthcare',
  
  // ========== PHARMACY ==========
  'cvs': 'Pharmacy',
  'walgreens': 'Pharmacy',
  'rite aid': 'Pharmacy',
  'duane reade': 'Pharmacy',
  'pharmacy': 'Pharmacy',
  'rx': 'Pharmacy',
  'prescription': 'Pharmacy',
  'medication': 'Pharmacy',
  'drugstore': 'Pharmacy',
  
  // ========== DOCTOR & DENTAL ==========
  'doctor': 'Doctor',
  'physician': 'Doctor',
  'copay': 'Doctor',
  'office visit': 'Doctor',
  'checkup': 'Doctor',
  'dental': 'Dental',
  'dentist': 'Dental',
  'orthodont': 'Dental',
  'oral surgeon': 'Dental',
  'endodont': 'Dental',
  'periodont': 'Dental',
  'teeth': 'Dental',
  'optom': 'Healthcare',
  'ophthalmolog': 'Healthcare',
  'vision': 'Healthcare',
  'eye doctor': 'Healthcare',
  'eye exam': 'Healthcare',
  'lenscrafters': 'Healthcare',
  'warby parker': 'Healthcare',
  'glasses': 'Healthcare',
  'contacts': 'Healthcare',
  
  // ========== FITNESS ==========
  'planet fitness': 'Fitness',
  'la fitness': 'Fitness',
  'equinox': 'Fitness',
  '24 hour fitness': 'Fitness',
  'anytime fitness': 'Fitness',
  'gold\'s gym': 'Fitness',
  'golds gym': 'Fitness',
  'crunch': 'Fitness',
  'orangetheory': 'Fitness',
  'crossfit': 'Fitness',
  'soulcycle': 'Fitness',
  'barry\'s': 'Fitness',
  'barrys': 'Fitness',
  'f45': 'Fitness',
  'ymca': 'Fitness',
  'ywca': 'Fitness',
  'peloton': 'Fitness',
  'classpass': 'Fitness',
  'mindbody': 'Fitness',
  'yoga': 'Fitness',
  'pilates': 'Fitness',
  'martial arts': 'Fitness',
  'boxing': 'Fitness',
  'gym': 'Fitness',
  'fitness': 'Fitness',
  'workout': 'Fitness',
  
  // ========== PETS ==========
  'petsmart': 'Pets',
  'petco': 'Pets',
  'pet supplies plus': 'Pets',
  'chewy': 'Pets',
  'rover': 'Pets',
  'wag': 'Pets',
  'doggy': 'Pets',
  'grooming': 'Pets',
  'kennel': 'Pets',
  'boarding': 'Pets',
  'pet': 'Pets',
  'veterinary': 'Vet',
  'veterinarian': 'Vet',
  'vet clinic': 'Vet',
  'animal hospital': 'Vet',
  'banfield': 'Vet',
  'vca': 'Vet',
  
  // ========== ENTERTAINMENT ==========
  'amc theatre': 'Movies',
  'regal cinema': 'Movies',
  'cinemark': 'Movies',
  'marcus theatre': 'Movies',
  'fandango': 'Movies',
  'atom tickets': 'Movies',
  'movie': 'Movies',
  'cinema': 'Movies',
  'theater': 'Entertainment',
  'theatre': 'Entertainment',
  'ticketmaster': 'Events',
  'stubhub': 'Events',
  'seatgeek': 'Events',
  'vivid seats': 'Events',
  'eventbrite': 'Events',
  'meetup': 'Events',
  'concert': 'Events',
  'live nation': 'Events',
  'broadway': 'Entertainment',
  'show': 'Entertainment',
  
  // ========== GAMING ==========
  'steam': 'Gaming',
  'playstation': 'Gaming',
  'psn': 'Gaming',
  'xbox': 'Gaming',
  'nintendo': 'Gaming',
  'eshop': 'Gaming',
  'epic games': 'Gaming',
  'blizzard': 'Gaming',
  'activision': 'Gaming',
  'ea': 'Gaming',
  'electronic arts': 'Gaming',
  'riot games': 'Gaming',
  'twitch': 'Gaming',
  'discord nitro': 'Gaming',
  
  // ========== PERSONAL CARE & BEAUTY ==========
  'supercuts': 'Personal Care',
  'great clips': 'Personal Care',
  'sport clips': 'Personal Care',
  'cost cutters': 'Personal Care',
  'salon': 'Personal Care',
  'barber': 'Personal Care',
  'haircut': 'Personal Care',
  'hair': 'Personal Care',
  'nails': 'Personal Care',
  'manicure': 'Personal Care',
  'pedicure': 'Personal Care',
  'waxing': 'Personal Care',
  'spa': 'Spa',
  'massage': 'Spa',
  'massage envy': 'Spa',
  'hand and stone': 'Spa',
  'facial': 'Spa',
  'sephora': 'Beauty',
  'ulta': 'Beauty',
  'mac cosmetics': 'Beauty',
  'lush': 'Beauty',
  'bath and body works': 'Beauty',
  'cosmetics': 'Beauty',
  'makeup': 'Beauty',
  'skincare': 'Beauty',
  
  // ========== EDUCATION ==========
  'school': 'Education',
  'university': 'Education',
  'college': 'Education',
  'tuition': 'Education',
  'student': 'Education',
  'textbook': 'Education',
  'chegg': 'Education',
  'udemy': 'Courses',
  'coursera': 'Courses',
  'edx': 'Courses',
  'skillshare': 'Courses',
  'masterclass': 'Courses',
  'linkedin learning': 'Courses',
  'pluralsight': 'Courses',
  'codecademy': 'Courses',
  'bootcamp': 'Courses',
  
  // ========== TRAVEL - HOTELS ==========
  'marriott': 'Hotels',
  'hilton': 'Hotels',
  'hyatt': 'Hotels',
  'ihg': 'Hotels',
  'holiday inn': 'Hotels',
  'best western': 'Hotels',
  'wyndham': 'Hotels',
  'choice hotels': 'Hotels',
  'radisson': 'Hotels',
  'sheraton': 'Hotels',
  'westin': 'Hotels',
  'doubletree': 'Hotels',
  'hampton inn': 'Hotels',
  'courtyard': 'Hotels',
  'fairfield inn': 'Hotels',
  'residence inn': 'Hotels',
  'la quinta': 'Hotels',
  'motel 6': 'Hotels',
  'super 8': 'Hotels',
  'red roof': 'Hotels',
  'airbnb': 'Hotels',
  'vrbo': 'Hotels',
  'booking.com': 'Hotels',
  'expedia': 'Hotels',
  'hotels.com': 'Hotels',
  'hotel': 'Hotels',
  'motel': 'Hotels',
  'lodging': 'Hotels',
  'resort': 'Hotels',
  
  // ========== TRAVEL - FLIGHTS ==========
  'delta air': 'Flights',
  'united air': 'Flights',
  'american airlines': 'Flights',
  'southwest air': 'Flights',
  'jetblue': 'Flights',
  'alaska air': 'Flights',
  'spirit air': 'Flights',
  'frontier air': 'Flights',
  'hawaiian air': 'Flights',
  'sun country': 'Flights',
  'allegiant': 'Flights',
  'air canada': 'Flights',
  'british airways': 'Flights',
  'lufthansa': 'Flights',
  'klm': 'Flights',
  'air france': 'Flights',
  'emirates': 'Flights',
  'qatar': 'Flights',
  'japan airlines': 'Flights',
  'ana': 'Flights',
  'cathay': 'Flights',
  'singapore air': 'Flights',
  'qantas': 'Flights',
  'airline': 'Flights',
  'airways': 'Flights',
  'flight': 'Flights',
  'skymiles': 'Flights',
  'kayak': 'Travel',
  'google flights': 'Travel',
  'priceline': 'Travel',
  'orbitz': 'Travel',
  'travelocity': 'Travel',
  'hopper': 'Travel',
  
  // ========== TRAVEL - CAR RENTAL ==========
  'enterprise': 'Travel',
  'hertz': 'Travel',
  'avis': 'Travel',
  'budget': 'Travel',
  'national car': 'Travel',
  'alamo': 'Travel',
  'dollar': 'Travel',
  'thrifty': 'Travel',
  'sixt': 'Travel',
  'turo': 'Travel',
  'zipcar': 'Travel',
  'car rental': 'Travel',
  
  // ========== BANKING & FINANCIAL ==========
  'atm': 'ATM',
  'atm withdrawal': 'ATM',
  'cash withdrawal': 'ATM',
  'transfer': 'Transfer',
  'wire transfer': 'Transfer',
  'ach': 'Transfer',
  'zelle': 'Transfer',
  'venmo': 'Transfer',
  'paypal': 'Transfer',
  'cash app': 'Transfer',
  'square cash': 'Transfer',
  'apple pay': 'Transfer',
  'google pay': 'Transfer',
  'bank fee': 'Bank Fees',
  'overdraft': 'Bank Fees',
  'service charge': 'Bank Fees',
  'monthly fee': 'Bank Fees',
  'maintenance fee': 'Bank Fees',
  'late fee': 'Bank Fees',
  
  // ========== INCOME ==========
  'payroll': 'Salary',
  'direct deposit': 'Salary',
  'salary': 'Salary',
  'paycheck': 'Salary',
  'wages': 'Salary',
  'compensation': 'Salary',
  'bonus': 'Salary',
  'commission': 'Salary',
  'employer': 'Salary',
  'refund': 'Refund',
  'rebate': 'Refund',
  'cashback': 'Refund',
  'reimbursement': 'Refund',
  'return': 'Refund',
  'credit': 'Refund',
  'reversal': 'Refund',
  'interest earned': 'Interest',
  'interest payment': 'Interest',
  'apy': 'Interest',
  'dividend': 'Dividends',
  'distribution': 'Dividends',
  'capital gain': 'Investments',
  
  // ========== TAXES ==========
  'irs': 'Tax',
  'tax payment': 'Tax',
  'federal tax': 'Tax',
  'state tax': 'Tax',
  'property tax': 'Tax',
  'income tax': 'Tax',
  'turbotax': 'Tax',
  'h&r block': 'Tax',
  'hr block': 'Tax',
  'jackson hewitt': 'Tax',
  'tax prep': 'Tax',
  
  // ========== INVESTMENTS ==========
  'fidelity': 'Investments',
  'schwab': 'Investments',
  'vanguard': 'Investments',
  'robinhood': 'Investments',
  'webull': 'Investments',
  'e*trade': 'Investments',
  'etrade': 'Investments',
  'td ameritrade': 'Investments',
  'merrill': 'Investments',
  'morgan stanley': 'Investments',
  'goldman': 'Investments',
  'betterment': 'Investments',
  'wealthfront': 'Investments',
  'acorns': 'Investments',
  'stash': 'Investments',
  'coinbase': 'Investments',
  'kraken': 'Investments',
  'binance': 'Investments',
  'crypto': 'Investments',
  'bitcoin': 'Investments',
  'ethereum': 'Investments',
  'stock': 'Investments',
  'etf': 'Investments',
  'mutual fund': 'Investments',
  '401k': 'Investments',
  'ira': 'Investments',
  'brokerage': 'Investments',
  
  // ========== CHARITY & GIFTS ==========
  'donation': 'Charity',
  'donate': 'Charity',
  'charity': 'Charity',
  'nonprofit': 'Charity',
  'gofundme': 'Charity',
  'red cross': 'Charity',
  'salvation army': 'Charity',
  'goodwill': 'Charity',
  'united way': 'Charity',
  'gift': 'Gifts',
  'present': 'Gifts',
  'hallmark': 'Gifts',
  'card shop': 'Gifts',
  'flower': 'Gifts',
  'florist': 'Gifts',
  '1800flowers': 'Gifts',
  'ftd': 'Gifts',
  'edible arrangements': 'Gifts',
  'godiva': 'Gifts',
  'see\'s candies': 'Gifts',
  'sees candies': 'Gifts',
  
  // ========== CHILDCARE & KIDS ==========
  'daycare': 'Education',
  'childcare': 'Education',
  'preschool': 'Education',
  'babysitter': 'Education',
  'nanny': 'Education',
  'toys r us': 'Shopping',
  'build-a-bear': 'Shopping',
  'children\'s place': 'Shopping',
  'carter\'s': 'Shopping',
  'carters': 'Shopping',
  'gymboree': 'Shopping',
  'disney store': 'Shopping',
  'lego': 'Shopping',
};

export const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: string; color: string }> = {
  depository: { label: 'Bank Account', icon: '🏦', color: 'text-blue-400' },
  credit: { label: 'Credit Card', icon: '💳', color: 'text-red-400' },
  investment: { label: 'Investment', icon: '📈', color: 'text-green-400' },
  loan: { label: 'Loan', icon: '📋', color: 'text-orange-400' },
  cash: { label: 'Cash', icon: '💵', color: 'text-emerald-400' },
  crypto: { label: 'Crypto', icon: '₿', color: 'text-yellow-400' },
};

// ============================================================
// CORE INTERFACES
// ============================================================

export interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  subtype?: AccountSubtype;
  institutionName?: string;
  institutionId?: string;
  balanceCurrent: number;
  balanceAvailable?: number;
  balanceLimit?: number;
  currency: string;
  // Interest/APR for credit accounts
  apr?: number;
  // Plaid fields
  plaidItemId?: string;
  plaidAccountId?: string;
  // SnapTrade fields
  snaptradeConnectionId?: string;
  snaptradeAccountId?: string;
  // Status
  isManual: boolean;
  isHidden: boolean;
  lastSyncedAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number; // Negative = expense, Positive = income
  date: string; // YYYY-MM-DD
  datetime?: string;
  merchantName?: string;
  description?: string;
  category: string[];
  categoryId?: string;
  // Source tracking
  plaidTransactionId?: string;
  isManual: boolean;
  isRecurring: boolean;
  recurringId?: string;
  // Status
  status: TransactionStatus;
  isTransfer: boolean;
  transferPairId?: string;
  // Metadata
  logoUrl?: string;
  website?: string;
  location?: TransactionLocation;
  paymentChannel?: PaymentChannel;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionLocation {
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lon?: number;
  address?: string;
  postalCode?: string;
}

export interface RecurringItem {
  id: string;
  userId: string;
  accountId?: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  category: string[];
  // Schedule
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  // Behavior
  autoConfirm: boolean;
  reminderDays: number;
  isIncome: boolean;
  isActive: boolean;
  // Tracking
  lastConfirmedDate?: string;
  missedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSnapshot {
  id: string;
  userId: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  investments: number;
  breakdown?: {
    depository?: number;
    credit?: number;
    investment?: number;
    loan?: number;
    cash?: number;
    crypto?: number;
  };
  createdAt: string;
}

export interface FinanceBudget {
  id: string;
  userId: string;
  name: string;
  category: string[];
  amount: number;
  period: BudgetPeriod;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Category Rule - User-defined categorization rules
export type CategoryRuleMatchType = 'exact' | 'contains' | 'starts_with' | 'regex';

export interface CategoryRule {
  id: string;
  userId: string;
  merchantPattern: string;
  normalizedPattern: string;
  matchType: CategoryRuleMatchType;
  category: string;
  sourceTransactionId?: string;
  hitCount: number;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRuleCreateInput {
  merchantPattern: string;
  matchType?: CategoryRuleMatchType;
  category: string;
  applyToExisting?: boolean;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResponse {
  success: boolean;
  itemId: string;
  accounts: FinanceAccount[];
}

export interface SyncResult {
  success: boolean;
  accountsUpdated: number;
  transactionsAdded: number;
  transactionsModified: number;
  transactionsRemoved: number;
  error?: string;
}

export interface SpendingSummary {
  period: string;
  totalSpent: number;
  totalIncome: number;
  netChange: number;
  byCategory: {
    category: string;
    amount: number;
    count: number;
    percentOfTotal: number;
  }[];
  byAccount: {
    accountId: string;
    accountName: string;
    amount: number;
  }[];
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  category: string[];
  accountName?: string;
}

// ============================================================
// SIMULATION TYPES
// ============================================================

export interface SimulationParams {
  years: number;
  monthlyContribution: number;
  expectedReturn: number; // 0.07 = 7%
  inflationRate?: number;
  majorPurchases?: {
    amount: number;
    year: number;
    description: string;
  }[];
  retirementAge?: number;
  currentAge?: number;
}

export interface SimulationResult {
  years: number[];
  baseline: number[]; // Current trajectory
  scenario: number[]; // With changes applied
  finalNetWorth: number;
  totalContributed: number;
  totalGrowth: number;
  projectedRetirementAge?: number;
  confidenceInterval?: {
    low: number[];
    high: number[];
  };
}

// ============================================================
// UI STATE TYPES
// ============================================================

export type FinanceTab = 'ledger' | 'recurring' | 'simulator' | 'insights';

export interface DateRange {
  start: string;
  end: string;
}

export interface TransactionFilters {
  accountIds?: string[];
  categories?: string[];
  status?: TransactionStatus[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
  dateRange?: DateRange;
  isRecurring?: boolean;
}

export interface FinanceAlert {
  id: string;
  type: 'bill_due' | 'anomaly' | 'budget_exceeded' | 'low_balance' | 'market_change';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  dismissedAt?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency: string = 'USD'): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absAmount >= 1_000_000) {
    return `${sign}$${(absAmount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `${sign}$${(absAmount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency);
}

export function getCategoryIcon(category: string | string[]): string {
  const mainCategory = Array.isArray(category) 
    ? category[0] || 'Other'
    : category.split(',')[0]?.trim() || category;
  return CATEGORY_ICONS[mainCategory] || '📦';
}

/**
 * Auto-categorize a transaction based on merchant name and description
 * Returns the most likely category or 'Other' if no match found
 */
export function categorizeTransaction(
  merchantName?: string,
  description?: string
): string {
  const searchText = `${merchantName || ''} ${description || ''}`.toLowerCase();
  
  // Sort keywords by length (longest first) to match more specific terms first
  const sortedKeywords = Object.keys(MERCHANT_CATEGORY_MAP).sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      const category = MERCHANT_CATEGORY_MAP[keyword];
      if (category) return category;
    }
  }
  
  return 'Other';
}

/**
 * Get all available category names for UI dropdowns/selectors
 */
export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_ICONS).filter(cat => cat !== 'Uncategorized');
}

export function getAccountTypeConfig(type: AccountType) {
  return ACCOUNT_TYPE_CONFIG[type] || ACCOUNT_TYPE_CONFIG.cash;
}

export function isAssetAccount(type: AccountType): boolean {
  return ['depository', 'investment', 'cash', 'crypto'].includes(type);
}

export function isLiabilityAccount(type: AccountType): boolean {
  return ['credit', 'loan'].includes(type);
}

export function calculateNetWorth(accounts: FinanceAccount[]): {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidAssets: number;
  investments: number;
} {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidAssets = 0;
  let investments = 0;

  for (const account of accounts) {
    if (account.isHidden) continue;
    
    if (isAssetAccount(account.type)) {
      totalAssets += account.balanceCurrent;
      if (account.type === 'depository' || account.type === 'cash') {
        liquidAssets += account.balanceCurrent;
      }
      if (account.type === 'investment' || account.type === 'crypto') {
        investments += account.balanceCurrent;
      }
    } else {
      totalLiabilities += Math.abs(account.balanceCurrent);
    }
  }

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    liquidAssets,
    investments,
  };
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getNextDueDate(
  frequency: RecurringFrequency,
  lastDate: string,
  dayOfMonth?: number,
  dayOfWeek?: number
): string {
  const date = new Date(lastDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      if (dayOfMonth) {
        date.setDate(Math.min(dayOfMonth, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
      }
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0] as string;
}
