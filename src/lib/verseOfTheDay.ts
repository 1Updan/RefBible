export interface VerseOfTheDay {
  bookId: number
  chapter: number
  verse: number
  osisId: string
  reference: string
  text: string
}

const VERSES: VerseOfTheDay[] = [
  // --- Gospels ---
  { bookId: 40, chapter: 5, verse: 14, osisId: 'MATT.5.14', reference: 'Matthew 5:14', text: 'Ye are the light of the world. A city that is set on an hill cannot be hid.' },
  { bookId: 40, chapter: 5, verse: 16, osisId: 'MATT.5.16', reference: 'Matthew 5:16', text: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' },
  { bookId: 40, chapter: 6, verse: 33, osisId: 'MATT.6.33', reference: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { bookId: 40, chapter: 7, verse: 7, osisId: 'MATT.7.7', reference: 'Matthew 7:7', text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.' },
  { bookId: 40, chapter: 11, verse: 28, osisId: 'MATT.11.28', reference: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { bookId: 40, chapter: 28, verse: 20, osisId: 'MATT.28.20', reference: 'Matthew 28:20', text: 'Lo, I am with you alway, even unto the end of the world.' },
  { bookId: 41, chapter: 10, verse: 27, osisId: 'MARK.10.27', reference: 'Mark 10:27', text: 'With God all things are possible.' },
  { bookId: 42, chapter: 1, verse: 37, osisId: 'LUKE.1.37', reference: 'Luke 1:37', text: 'For with God nothing shall be impossible.' },
  { bookId: 42, chapter: 6, verse: 38, osisId: 'LUKE.6.38', reference: 'Luke 6:38', text: 'Give, and it shall be given unto you; good measure, pressed down, and shaken together, and running over, shall men give into your bosom.' },
  { bookId: 43, chapter: 1, verse: 12, osisId: 'JHN.1.12', reference: 'John 1:12', text: 'But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name.' },
  { bookId: 43, chapter: 3, verse: 16, osisId: 'JHN.3.16', reference: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { bookId: 43, chapter: 8, verse: 32, osisId: 'JHN.8.32', reference: 'John 8:32', text: 'And ye shall know the truth, and the truth shall make you free.' },
  { bookId: 43, chapter: 10, verse: 10, osisId: 'JHN.10.10', reference: 'John 10:10', text: 'I am come that they might have life, and that they might have it more abundantly.' },
  { bookId: 43, chapter: 14, verse: 1, osisId: 'JHN.14.1', reference: 'John 14:1', text: 'Let not your heart be troubled: ye believe in God, believe also in me.' },
  { bookId: 43, chapter: 14, verse: 6, osisId: 'JHN.14.6', reference: 'John 14:6', text: 'I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
  { bookId: 43, chapter: 14, verse: 27, osisId: 'JHN.14.27', reference: 'John 14:27', text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.' },
  { bookId: 43, chapter: 15, verse: 5, osisId: 'JHN.15.5', reference: 'John 15:5', text: 'I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing.' },
  { bookId: 43, chapter: 15, verse: 13, osisId: 'JHN.15.13', reference: 'John 15:13', text: 'Greater love hath no man than this, that a man lay down his life for his friends.' },
  { bookId: 43, chapter: 16, verse: 33, osisId: 'JHN.16.33', reference: 'John 16:33', text: 'In the world ye shall have tribulation: but be of good cheer; I have overcome the world.' },
  // --- Psalms ---
  { bookId: 19, chapter: 1, verse: 1, osisId: 'PS.1.1', reference: 'Psalm 1:1', text: 'Blessed is the man that walketh not in the counsel of the ungodly, nor standeth in the way of sinners, nor sitteth in the seat of the scornful.' },
  { bookId: 19, chapter: 1, verse: 2, osisId: 'PS.1.2', reference: 'Psalm 1:2', text: 'But his delight is in the law of the LORD; and in his law doth he meditate day and night.' },
  { bookId: 19, chapter: 18, verse: 2, osisId: 'PS.18.2', reference: 'Psalm 18:2', text: 'The LORD is my rock, and my fortress, and my deliverer; my God, my strength, in whom I will trust.' },
  { bookId: 19, chapter: 19, verse: 14, osisId: 'PS.19.14', reference: 'Psalm 19:14', text: 'Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer.' },
  { bookId: 19, chapter: 23, verse: 1, osisId: 'PS.23.1', reference: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { bookId: 19, chapter: 23, verse: 4, osisId: 'PS.23.4', reference: 'Psalm 23:4', text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
  { bookId: 19, chapter: 23, verse: 6, osisId: 'PS.23.6', reference: 'Psalm 23:6', text: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.' },
  { bookId: 19, chapter: 27, verse: 1, osisId: 'PS.27.1', reference: 'Psalm 27:1', text: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
  { bookId: 19, chapter: 34, verse: 8, osisId: 'PS.34.8', reference: 'Psalm 34:8', text: 'O taste and see that the LORD is good: blessed is the man that trusteth in him.' },
  { bookId: 19, chapter: 34, verse: 18, osisId: 'PS.34.18', reference: 'Psalm 34:18', text: 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.' },
  { bookId: 19, chapter: 37, verse: 4, osisId: 'PS.37.4', reference: 'Psalm 37:4', text: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.' },
  { bookId: 19, chapter: 37, verse: 5, osisId: 'PS.37.5', reference: 'Psalm 37:5', text: 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.' },
  { bookId: 19, chapter: 40, verse: 1, osisId: 'PS.40.1', reference: 'Psalm 40:1', text: 'I waited patiently for the LORD; and he inclined unto me, and heard my cry.' },
  { bookId: 19, chapter: 46, verse: 1, osisId: 'PS.46.1', reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { bookId: 19, chapter: 46, verse: 10, osisId: 'PS.46.10', reference: 'Psalm 46:10', text: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.' },
  { bookId: 19, chapter: 51, verse: 10, osisId: 'PS.51.10', reference: 'Psalm 51:10', text: 'Create in me a clean heart, O God; and renew a right spirit within me.' },
  { bookId: 19, chapter: 55, verse: 22, osisId: 'PS.55.22', reference: 'Psalm 55:22', text: 'Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.' },
  { bookId: 19, chapter: 84, verse: 11, osisId: 'PS.84.11', reference: 'Psalm 84:11', text: 'For the LORD God is a sun and shield: the LORD will give grace and glory: no good thing will he withhold from them that walk uprightly.' },
  { bookId: 19, chapter: 90, verse: 12, osisId: 'PS.90.12', reference: 'Psalm 90:12', text: 'So teach us to number our days, that we may apply our hearts unto wisdom.' },
  { bookId: 19, chapter: 91, verse: 1, osisId: 'PS.91.1', reference: 'Psalm 91:1', text: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.' },
  { bookId: 19, chapter: 91, verse: 2, osisId: 'PS.91.2', reference: 'Psalm 91:2', text: 'I will say of the LORD, He is my refuge and my fortress: my God; in him will I trust.' },
  { bookId: 19, chapter: 100, verse: 1, osisId: 'PS.100.1', reference: 'Psalm 100:1', text: 'Make a joyful noise unto the LORD, all ye lands.' },
  { bookId: 19, chapter: 100, verse: 5, osisId: 'PS.100.5', reference: 'Psalm 100:5', text: 'For the LORD is good; his mercy is everlasting; and his truth endureth to all generations.' },
  { bookId: 19, chapter: 103, verse: 1, osisId: 'PS.103.1', reference: 'Psalm 103:1', text: 'Bless the LORD, O my soul: and all that is within me, bless his holy name.' },
  { bookId: 19, chapter: 107, verse: 1, osisId: 'PS.107.1', reference: 'Psalm 107:1', text: 'O give thanks unto the LORD, for he is good: for his mercy endureth for ever.' },
  { bookId: 19, chapter: 118, verse: 24, osisId: 'PS.118.24', reference: 'Psalm 118:24', text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.' },
  { bookId: 19, chapter: 119, verse: 9, osisId: 'PS.119.9', reference: 'Psalm 119:9', text: 'Wherewithal shall a young man cleanse his way? by taking heed thereto according to thy word.' },
  { bookId: 19, chapter: 119, verse: 11, osisId: 'PS.119.11', reference: 'Psalm 119:11', text: 'Thy word have I hid in mine heart, that I might not sin against thee.' },
  { bookId: 19, chapter: 119, verse: 105, osisId: 'PS.119.105', reference: 'Psalm 119:105', text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { bookId: 19, chapter: 121, verse: 1, osisId: 'PS.121.1', reference: 'Psalm 121:1', text: 'I will lift up mine eyes unto the hills, from whence cometh my help.' },
  { bookId: 19, chapter: 121, verse: 2, osisId: 'PS.121.2', reference: 'Psalm 121:2', text: 'My help cometh from the LORD, which made heaven and earth.' },
  { bookId: 19, chapter: 126, verse: 5, osisId: 'PS.126.5', reference: 'Psalm 126:5', text: 'They that sow in tears shall reap in joy.' },
  { bookId: 19, chapter: 136, verse: 1, osisId: 'PS.136.1', reference: 'Psalm 136:1', text: 'O give thanks unto the LORD; for he is good: for his mercy endureth for ever.' },
  { bookId: 19, chapter: 139, verse: 14, osisId: 'PS.139.14', reference: 'Psalm 139:14', text: 'I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.' },
  { bookId: 19, chapter: 139, verse: 23, osisId: 'PS.139.23', reference: 'Psalm 139:23', text: 'Search me, O God, and know my heart: try me, and know my thoughts.' },
  { bookId: 19, chapter: 145, verse: 18, osisId: 'PS.145.18', reference: 'Psalm 145:18', text: 'The LORD is nigh unto all them that call upon him, to all that call upon him in truth.' },
  { bookId: 19, chapter: 150, verse: 6, osisId: 'PS.150.6', reference: 'Psalm 150:6', text: 'Let every thing that hath breath praise the LORD. Praise ye the LORD.' },
  // --- Proverbs ---
  { bookId: 20, chapter: 3, verse: 5, osisId: 'PROV.3.5', reference: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { bookId: 20, chapter: 3, verse: 6, osisId: 'PROV.3.6', reference: 'Proverbs 3:6', text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },
  { bookId: 20, chapter: 3, verse: 9, osisId: 'PROV.3.9', reference: 'Proverbs 3:9', text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase.' },
  { bookId: 20, chapter: 4, verse: 23, osisId: 'PROV.4.23', reference: 'Proverbs 4:23', text: 'Keep thy heart with all diligence; for out of it are the issues of life.' },
  { bookId: 20, chapter: 9, verse: 10, osisId: 'PROV.9.10', reference: 'Proverbs 9:10', text: 'The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.' },
  { bookId: 20, chapter: 11, verse: 25, osisId: 'PROV.11.25', reference: 'Proverbs 11:25', text: 'The liberal soul shall be made fat: and he that watereth shall be watered also himself.' },
  { bookId: 20, chapter: 12, verse: 25, osisId: 'PROV.12.25', reference: 'Proverbs 12:25', text: 'Heaviness in the heart of man maketh it stoop: but a good word maketh it glad.' },
  { bookId: 20, chapter: 15, verse: 1, osisId: 'PROV.15.1', reference: 'Proverbs 15:1', text: 'A soft answer turneth away wrath: but grievous words stir up anger.' },
  { bookId: 20, chapter: 15, verse: 13, osisId: 'PROV.15.13', reference: 'Proverbs 15:13', text: 'A merry heart maketh a cheerful countenance: but by sorrow of the heart the spirit is broken.' },
  { bookId: 20, chapter: 16, verse: 3, osisId: 'PROV.16.3', reference: 'Proverbs 16:3', text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
  { bookId: 20, chapter: 16, verse: 9, osisId: 'PROV.16.9', reference: 'Proverbs 16:9', text: `A man's heart deviseth his way: but the LORD directeth his steps.` },
  { bookId: 20, chapter: 17, verse: 17, osisId: 'PROV.17.17', reference: 'Proverbs 17:17', text: 'A friend loveth at all times, and a brother is born for adversity.' },
  { bookId: 20, chapter: 18, verse: 10, osisId: 'PROV.18.10', reference: 'Proverbs 18:10', text: 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.' },
  { bookId: 20, chapter: 22, verse: 6, osisId: 'PROV.22.6', reference: 'Proverbs 22:6', text: 'Train up a child in the way he should go: and when he is old, he will not depart from it.' },
  { bookId: 20, chapter: 27, verse: 17, osisId: 'PROV.27.17', reference: 'Proverbs 27:17', text: 'Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.' },
  { bookId: 20, chapter: 30, verse: 5, osisId: 'PROV.30.5', reference: 'Proverbs 30:5', text: 'Every word of God is pure: he is a shield unto them that put their trust in him.' },
  // --- Paul's Epistles ---
  { bookId: 45, chapter: 5, verse: 8, osisId: 'ROM.5.8', reference: 'Romans 5:8', text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
  { bookId: 45, chapter: 8, verse: 1, osisId: 'ROM.8.1', reference: 'Romans 8:1', text: 'There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.' },
  { bookId: 45, chapter: 8, verse: 28, osisId: 'ROM.8.28', reference: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { bookId: 45, chapter: 8, verse: 31, osisId: 'ROM.8.31', reference: 'Romans 8:31', text: 'If God be for us, who can be against us?' },
  { bookId: 45, chapter: 8, verse: 38, osisId: 'ROM.8.38', reference: 'Romans 8:38', text: 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,' },
  { bookId: 45, chapter: 8, verse: 39, osisId: 'ROM.8.39', reference: 'Romans 8:39', text: 'Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.' },
  { bookId: 45, chapter: 12, verse: 2, osisId: 'ROM.12.2', reference: 'Romans 12:2', text: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.' },
  { bookId: 45, chapter: 12, verse: 12, osisId: 'ROM.12.12', reference: 'Romans 12:12', text: 'Rejoicing in hope; patient in tribulation; continuing instant in prayer.' },
  { bookId: 45, chapter: 15, verse: 13, osisId: 'ROM.15.13', reference: 'Romans 15:13', text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' },
  { bookId: 46, chapter: 10, verse: 13, osisId: '1COR.10.13', reference: '1 Corinthians 10:13', text: 'God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.' },
  { bookId: 46, chapter: 13, verse: 4, osisId: '1COR.13.4', reference: '1 Corinthians 13:4', text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.' },
  { bookId: 46, chapter: 13, verse: 13, osisId: '1COR.13.13', reference: '1 Corinthians 13:13', text: 'And now abideth faith, hope, charity, these three; but the greatest of these is charity.' },
  { bookId: 46, chapter: 15, verse: 58, osisId: '1COR.15.58', reference: '1 Corinthians 15:58', text: 'Therefore, my beloved brethren, be ye stedfast, unmoveable, always abounding in the work of the Lord, forasmuch as ye know that your labour is not in vain in the Lord.' },
  { bookId: 46, chapter: 16, verse: 14, osisId: '1COR.16.14', reference: '1 Corinthians 16:14', text: 'Let all your things be done with charity.' },
  { bookId: 47, chapter: 4, verse: 16, osisId: '2COR.4.16', reference: '2 Corinthians 4:16', text: 'For which cause we faint not; but though our outward man perish, yet the inward man is renewed day by day.' },
  { bookId: 47, chapter: 5, verse: 17, osisId: '2COR.5.17', reference: '2 Corinthians 5:17', text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.' },
  { bookId: 47, chapter: 9, verse: 8, osisId: '2COR.9.8', reference: '2 Corinthians 9:8', text: 'And God is able to make all grace abound toward you; that ye, always having all sufficiency in all things, may abound to every good work.' },
  { bookId: 47, chapter: 12, verse: 9, osisId: '2COR.12.9', reference: '2 Corinthians 12:9', text: 'My grace is sufficient for thee: for my strength is made perfect in weakness.' },
  { bookId: 48, chapter: 2, verse: 20, osisId: 'GAL.2.20', reference: 'Galatians 2:20', text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.' },
  { bookId: 48, chapter: 5, verse: 22, osisId: 'GAL.5.22', reference: 'Galatians 5:22', text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,' },
  { bookId: 48, chapter: 5, verse: 23, osisId: 'GAL.5.23', reference: 'Galatians 5:23', text: 'Meekness, temperance: against such there is no law.' },
  { bookId: 49, chapter: 1, verse: 3, osisId: 'EPH.1.3', reference: 'Ephesians 1:3', text: 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ.' },
  { bookId: 49, chapter: 2, verse: 8, osisId: 'EPH.2.8', reference: 'Ephesians 2:8', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.' },
  { bookId: 49, chapter: 2, verse: 9, osisId: 'EPH.2.9', reference: 'Ephesians 2:9', text: 'Not of works, lest any man should boast.' },
  { bookId: 49, chapter: 3, verse: 20, osisId: 'EPH.3.20', reference: 'Ephesians 3:20', text: 'Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us.' },
  { bookId: 49, chapter: 4, verse: 32, osisId: 'EPH.4.32', reference: 'Ephesians 4:32', text: `And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.` },
  { bookId: 49, chapter: 6, verse: 10, osisId: 'EPH.6.10', reference: 'Ephesians 6:10', text: 'Finally, my brethren, be strong in the Lord, and in the power of his might.' },
  { bookId: 50, chapter: 1, verse: 6, osisId: 'PHIL.1.6', reference: 'Philippians 1:6', text: 'Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.' },
  { bookId: 50, chapter: 2, verse: 3, osisId: 'PHIL.2.3', reference: 'Philippians 2:3', text: 'Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves.' },
  { bookId: 50, chapter: 2, verse: 4, osisId: 'PHIL.2.4', reference: 'Philippians 2:4', text: 'Look not every man on his own things, but every man also on the things of others.' },
  { bookId: 50, chapter: 4, verse: 4, osisId: 'PHIL.4.4', reference: 'Philippians 4:4', text: 'Rejoice in the Lord alway: and again I say, Rejoice.' },
  { bookId: 50, chapter: 4, verse: 6, osisId: 'PHIL.4.6', reference: 'Philippians 4:6', text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
  { bookId: 50, chapter: 4, verse: 7, osisId: 'PHIL.4.7', reference: 'Philippians 4:7', text: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.' },
  { bookId: 50, chapter: 4, verse: 8, osisId: 'PHIL.4.8', reference: 'Philippians 4:8', text: 'Whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things.' },
  { bookId: 50, chapter: 4, verse: 13, osisId: 'PHIL.4.13', reference: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { bookId: 50, chapter: 4, verse: 19, osisId: 'PHIL.4.19', reference: 'Philippians 4:19', text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.' },
  { bookId: 51, chapter: 3, verse: 1, osisId: 'COL.3.1', reference: 'Colossians 3:1', text: 'If ye then be risen with Christ, seek those things which are above, where Christ sitteth on the right hand of God.' },
  { bookId: 51, chapter: 3, verse: 2, osisId: 'COL.3.2', reference: 'Colossians 3:2', text: 'Set your affection on things above, not on things on the earth.' },
  { bookId: 51, chapter: 3, verse: 23, osisId: 'COL.3.23', reference: 'Colossians 3:23', text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.' },
  { bookId: 52, chapter: 5, verse: 16, osisId: '1THESS.5.16', reference: '1 Thessalonians 5:16', text: 'Rejoice evermore.' },
  { bookId: 52, chapter: 5, verse: 17, osisId: '1THESS.5.17', reference: '1 Thessalonians 5:17', text: 'Pray without ceasing.' },
  { bookId: 52, chapter: 5, verse: 18, osisId: '1THESS.5.18', reference: '1 Thessalonians 5:18', text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
  { bookId: 55, chapter: 1, verse: 7, osisId: '2TIM.1.7', reference: '2 Timothy 1:7', text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
  { bookId: 55, chapter: 3, verse: 16, osisId: '2TIM.3.16', reference: '2 Timothy 3:16', text: 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.' },
  { bookId: 55, chapter: 4, verse: 7, osisId: '2TIM.4.7', reference: '2 Timothy 4:7', text: 'I have fought a good fight, I have finished my course, I have kept the faith.' },
  // --- Hebrews & General Epistles ---
  { bookId: 58, chapter: 4, verse: 12, osisId: 'HEB.4.12', reference: 'Hebrews 4:12', text: 'For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart.' },
  { bookId: 58, chapter: 6, verse: 19, osisId: 'HEB.6.19', reference: 'Hebrews 6:19', text: 'Which hope we have as an anchor of the soul, both sure and stedfast, and which entereth into that within the veil.' },
  { bookId: 58, chapter: 11, verse: 1, osisId: 'HEB.11.1', reference: 'Hebrews 11:1', text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { bookId: 58, chapter: 11, verse: 6, osisId: 'HEB.11.6', reference: 'Hebrews 11:6', text: 'But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.' },
  { bookId: 58, chapter: 12, verse: 1, osisId: 'HEB.12.1', reference: 'Hebrews 12:1', text: 'Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us.' },
  { bookId: 58, chapter: 12, verse: 2, osisId: 'HEB.12.2', reference: 'Hebrews 12:2', text: 'Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God.' },
  { bookId: 58, chapter: 13, verse: 5, osisId: 'HEB.13.5', reference: 'Hebrews 13:5', text: 'I will never leave thee, nor forsake thee.' },
  { bookId: 58, chapter: 13, verse: 8, osisId: 'HEB.13.8', reference: 'Hebrews 13:8', text: 'Jesus Christ the same yesterday, and to day, and for ever.' },
  { bookId: 59, chapter: 1, verse: 2, osisId: 'JAS.1.2', reference: 'James 1:2', text: 'My brethren, count it all joy when ye fall into divers temptations.' },
  { bookId: 59, chapter: 1, verse: 3, osisId: 'JAS.1.3', reference: 'James 1:3', text: 'Knowing this, that the trying of your faith worketh patience.' },
  { bookId: 59, chapter: 1, verse: 4, osisId: 'JAS.1.4', reference: 'James 1:4', text: 'But let patience have her perfect work, that ye may be perfect and entire, wanting nothing.' },
  { bookId: 59, chapter: 1, verse: 5, osisId: 'JAS.1.5', reference: 'James 1:5', text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.' },
  { bookId: 59, chapter: 1, verse: 17, osisId: 'JAS.1.17', reference: 'James 1:17', text: 'Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning.' },
  { bookId: 59, chapter: 4, verse: 8, osisId: 'JAS.4.8', reference: 'James 4:8', text: 'Draw nigh to God, and he will draw nigh to you.' },
  { bookId: 60, chapter: 2, verse: 9, osisId: '1PET.2.9', reference: '1 Peter 2:9', text: 'But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light.' },
  { bookId: 60, chapter: 5, verse: 6, osisId: '1PET.5.6', reference: '1 Peter 5:6', text: 'Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time.' },
  { bookId: 60, chapter: 5, verse: 7, osisId: '1PET.5.7', reference: '1 Peter 5:7', text: 'Casting all your care upon him; for he careth for you.' },
  { bookId: 62, chapter: 3, verse: 1, osisId: '1JHN.3.1', reference: '1 John 3:1', text: 'Behold, what manner of love the Father hath bestowed upon us, that we should be called the sons of God.' },
  { bookId: 62, chapter: 4, verse: 7, osisId: '1JHN.4.7', reference: '1 John 4:7', text: 'Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God.' },
  { bookId: 62, chapter: 4, verse: 8, osisId: '1JHN.4.8', reference: '1 John 4:8', text: 'He that loveth not knoweth not God; for God is love.' },
  { bookId: 62, chapter: 4, verse: 18, osisId: '1JHN.4.18', reference: '1 John 4:18', text: 'There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love.' },
  { bookId: 62, chapter: 4, verse: 19, osisId: '1JHN.4.19', reference: '1 John 4:19', text: 'We love him, because he first loved us.' },
  // --- Prophets (hope & restoration) ---
  { bookId: 23, chapter: 1, verse: 18, osisId: 'ISA.1.18', reference: 'Isaiah 1:18', text: 'Come now, and let us reason together, saith the LORD: though your sins be as scarlet, they shall be as white as snow; though they be red like crimson, they shall be as wool.' },
  { bookId: 23, chapter: 26, verse: 3, osisId: 'ISA.26.3', reference: 'Isaiah 26:3', text: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.' },
  { bookId: 23, chapter: 40, verse: 8, osisId: 'ISA.40.8', reference: 'Isaiah 40:8', text: 'The grass withereth, the flower fadeth: but the word of our God shall stand for ever.' },
  { bookId: 23, chapter: 40, verse: 31, osisId: 'ISA.40.31', reference: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { bookId: 23, chapter: 41, verse: 10, osisId: 'ISA.41.10', reference: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
  { bookId: 23, chapter: 43, verse: 1, osisId: 'ISA.43.1', reference: 'Isaiah 43:1', text: 'Fear not: for I have redeemed thee, I have called thee by thy name; thou art mine.' },
  { bookId: 23, chapter: 43, verse: 18, osisId: 'ISA.43.18', reference: 'Isaiah 43:18', text: 'Remember ye not the former things, neither consider the things of old.' },
  { bookId: 23, chapter: 43, verse: 19, osisId: 'ISA.43.19', reference: 'Isaiah 43:19', text: 'Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert.' },
  { bookId: 23, chapter: 55, verse: 8, osisId: 'ISA.55.8', reference: 'Isaiah 55:8', text: 'For my thoughts are not your thoughts, neither are your ways my ways, saith the LORD.' },
  { bookId: 23, chapter: 55, verse: 9, osisId: 'ISA.55.9', reference: 'Isaiah 55:9', text: 'For as the heavens are higher than the earth, so are my ways higher than your ways, and my thoughts than your thoughts.' },
  { bookId: 23, chapter: 55, verse: 11, osisId: 'ISA.55.11', reference: 'Isaiah 55:11', text: 'So shall my word be that goeth forth out of my mouth: it shall not return unto me void, but it shall accomplish that which I please, and it shall prosper in the thing whereto I sent it.' },
  { bookId: 23, chapter: 61, verse: 10, osisId: 'ISA.61.10', reference: 'Isaiah 61:10', text: 'I will greatly rejoice in the LORD, my soul shall be joyful in my God; for he hath clothed me with the garments of salvation, he hath covered me with the robe of righteousness.' },
  { bookId: 24, chapter: 29, verse: 11, osisId: 'JER.29.11', reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { bookId: 25, chapter: 3, verse: 22, osisId: 'LAM.3.22', reference: 'Lamentations 3:22', text: `It is of the LORD's mercies that we are not consumed, because his compassions fail not.` },
  { bookId: 25, chapter: 3, verse: 23, osisId: 'LAM.3.23', reference: 'Lamentations 3:23', text: 'They are new every morning: great is thy faithfulness.' },
  { bookId: 26, chapter: 36, verse: 26, osisId: 'EZEK.36.26', reference: 'Ezekiel 36:26', text: 'A new heart also will I give you, and a new spirit will I put within you: and I will take away the stony heart out of your flesh, and I will give you an heart of flesh.' },
  { bookId: 36, chapter: 3, verse: 17, osisId: 'ZEPH.3.17', reference: 'Zephaniah 3:17', text: 'The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing.' },
  { bookId: 38, chapter: 4, verse: 6, osisId: 'ZECH.4.6', reference: 'Zechariah 4:6', text: 'Not by might, nor by power, but by my spirit, saith the LORD of hosts.' },
  { bookId: 39, chapter: 3, verse: 10, osisId: 'MAL.3.10', reference: 'Malachi 3:10', text: 'Bring ye all the tithes into the storehouse, that there may be meat in mine house, and prove me now herewith, saith the LORD of hosts, if I will not open you the windows of heaven, and pour you out a blessing, that there shall not be room enough to receive it.' },
  // --- Acts ---
  { bookId: 44, chapter: 1, verse: 8, osisId: 'ACTS.1.8', reference: 'Acts 1:8', text: 'But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.' },
  // --- Revelation ---
  { bookId: 66, chapter: 3, verse: 20, osisId: 'REV.3.20', reference: 'Revelation 3:20', text: 'Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in to him, and will sup with him, and he with me.' },
  { bookId: 66, chapter: 21, verse: 4, osisId: 'REV.21.4', reference: 'Revelation 21:4', text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.' },
]

export function getTodaysVerse(): VerseOfTheDay {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const oneDay = 86400000
  const dayOfYear = Math.floor(diff / oneDay)
  const index = dayOfYear % VERSES.length
  return VERSES[index]
}

export function shouldSendNotificationToday(): boolean {
  const today = new Date().toDateString()
  const last = localStorage.getItem('votd-notification-date')
  return last !== today
}

export function markNotificationSent(): void {
  localStorage.setItem('votd-notification-date', new Date().toDateString())
}

export function getPendingVotdNavigation(): string | null {
  return localStorage.getItem('votd-navigate-to')
}

export function setPendingVotdNavigation(osisId: string | null): void {
  if (osisId) {
    localStorage.setItem('votd-navigate-to', osisId)
  } else {
    localStorage.removeItem('votd-navigate-to')
  }
}

export function clearPendingVotdNavigation(): void {
  localStorage.removeItem('votd-navigate-to')
}
