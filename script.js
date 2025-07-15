// 시도교육청 코드/이름 목록 (공공데이터포털 기준)
const EDUCATION_OFFICES = [
    { code: 'B10', name: '서울특별시교육청' },
    { code: 'C10', name: '부산광역시교육청' },
    { code: 'D10', name: '대구광역시교육청' },
    { code: 'E10', name: '인천광역시교육청' },
    { code: 'F10', name: '광주광역시교육청' },
    { code: 'G10', name: '대전광역시교육청' },
    { code: 'H10', name: '울산광역시교육청' },
    { code: 'I10', name: '세종특별자치시교육청' },
    { code: 'J10', name: '경기도교육청' },
    { code: 'K10', name: '강원도교육청' },
    { code: 'M10', name: '충청북도교육청' },
    { code: 'N10', name: '충청남도교육청' },
    { code: 'P10', name: '전라북도교육청' },
    { code: 'Q10', name: '전라남도교육청' },
    { code: 'R10', name: '경상북도교육청' },
    { code: 'S10', name: '경상남도교육청' },
    { code: 'T10', name: '제주특별자치도교육청' }
];

// API 키를 직접 하드코딩
const API_KEY = 'c794d0ae04e94ced8879962122d4cec2';

// NEIS 학교 검색 API (공공데이터포털)
async function searchSchoolsByName(name, officeCode) {
    const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SCHUL_NM=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('학교 검색 API 요청 실패');
    const data = await res.json();
    if (!data.schoolInfo || !data.schoolInfo[1]) return [];
    return data.schoolInfo[1].row;
}

// 급식 정보 조회 함수 (NEIS)
async function fetchMeal(officeCode, schoolCode, mealDate) {
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${mealDate}&Type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('급식 API 요청 실패');
    const data = await res.json();
    return data;
}

// 급식 데이터 파싱 함수
function parseMealData(data) {
    if (!data.mealServiceDietInfo || !data.mealServiceDietInfo[1]) {
        return '해당 날짜의 급식 정보가 없습니다.';
    }
    const meal = data.mealServiceDietInfo[1].row[0];
    return `\n[${meal.MLSV_YMD} 급식]\n\n${meal.DDISH_NM.replace(/<br\/>/g, '\n')}`;
}

// 오늘 날짜를 YYYYMMDD로 반환
function getToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`; // type=date 기본값용 (YYYY-MM-DD)
}

function dateToYYYYMMDD(dateStr) {
    // 'YYYY-MM-DD' → 'YYYYMMDD'
    return dateStr.replace(/-/g, '');
}

document.addEventListener('DOMContentLoaded', () => {
    const officeSelect = document.getElementById('officeSelect');
    const searchForm = document.getElementById('searchForm');
    const mealForm = document.getElementById('mealForm');
    const schoolSelect = document.getElementById('schoolSelect');
    const mealDateInput = document.getElementById('mealDate');
    const result = document.getElementById('result');

    // 시도교육청 select 박스 채우기
    EDUCATION_OFFICES.forEach(office => {
        const option = document.createElement('option');
        option.value = office.code;
        option.textContent = office.name;
        officeSelect.appendChild(option);
    });

    mealDateInput.value = getToday();

    // 학교명 검색
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const officeCode = officeSelect.value;
        const schoolName = searchForm.schoolName.value.trim();
        result.textContent = '학교 검색 중...';
        mealForm.style.display = 'none';
        schoolSelect.innerHTML = '';
        try {
            const schools = await searchSchoolsByName(schoolName, officeCode);
            if (schools.length === 0) {
                result.textContent = '검색 결과가 없습니다.';
                return;
            }
            // select 박스에 학교 목록 추가
            schools.forEach(school => {
                const option = document.createElement('option');
                option.value = JSON.stringify({
                    officeCode: school.ATPT_OFCDC_SC_CODE,
                    schoolCode: school.SD_SCHUL_CODE,
                    name: school.SCHUL_NM,
                    address: school.ORG_RDNMA
                });
                option.textContent = `${school.SCHUL_NM} (${school.ORG_RDNMA})`;
                schoolSelect.appendChild(option);
            });
            mealForm.style.display = '';
            result.textContent = '학교를 선택하고 날짜를 입력 후 조회하세요.';
        } catch (err) {
            result.textContent = '오류: ' + err.message;
        }
    });

    // 급식 조회
    mealForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        result.textContent = '급식 조회 중...';
        const selected = schoolSelect.value;
        if (!selected) {
            result.textContent = '학교를 선택하세요.';
            return;
        }
        const school = JSON.parse(selected);
        const mealDate = dateToYYYYMMDD(mealDateInput.value);
        try {
            const data = await fetchMeal(school.officeCode, school.schoolCode, mealDate);
            result.textContent = parseMealData(data);
        } catch (err) {
            result.textContent = '오류: ' + err.message + '\n(공공데이터포털 API는 CORS 정책으로 인해 직접 호출이 안 될 수 있습니다. 이 경우 서버 프록시가 필요합니다.)';
        }
    });
});
