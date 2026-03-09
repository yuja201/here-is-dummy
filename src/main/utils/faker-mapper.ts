export const fakerMapper: Record<string, string> = {
  이름: 'person.firstName',
  성: 'person.lastName',
  '전체 이름': 'person.fullName',
  직업명: 'person.jobTitle',

  '도로명 주소': 'location.streetAddress',
  도시: 'location.city',
  국가: 'location.country',
  우편번호: 'location.zipCode',

  이메일: 'internet.email',
  전화번호: 'phone.number',
  사용자명: 'internet.username',
  도메인: 'internet.domainName',

  회사명: 'company.name',
  슬로건: 'company.catchPhrase',
  부서: 'commerce.department',

  계좌번호: 'finance.accountNumber',
  금액: 'finance.amount',
  카드번호: 'finance.creditCardNumber',
  거래유형: 'finance.transactionType',

  상품명: 'commerce.productName',
  카테고리: 'commerce.department',
  가격: 'commerce.price',
  설명: 'lorem.sentence',

  제조사: 'vehicle.manufacturer',
  모델명: 'vehicle.model',
  '차량 타입': 'vehicle.type',

  '과거 날짜': 'date.past',
  '미래 날짜': 'date.future',
  '최근 날짜': 'date.recent',

  UUID: 'string.uuid',
  파일명: 'system.fileName',
  버전: 'system.semver',
  '커밋 메시지': 'git.commitMessage',

  정수: 'number.int',
  실수: 'number.float',
  불리언: 'datatype.boolean',
  '랜덤 문자열': 'string.alphanumeric',

  문장: 'lorem.sentence',
  문단: 'lorem.paragraph',
  단어: 'lorem.word',

  '화학 원소': 'science.chemicalElement',
  단위: 'science.unit',

  색상명: 'color.human',
  'RGB 값': 'color.rgb',
  'HEX 코드': 'color.rgb',
  '이미지 URL': 'image.url',

  '음악 장르': 'music.genre',
  '노래 이름': 'music.songName',
  '동물 이름': 'animal.type'
}
