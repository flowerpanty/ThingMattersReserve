// Test script to verify birthday bear pricing
const testData = {
    customerName: "테스트",
    customerContact: "test@test.com",
    customerPhone: "01012345678",
    deliveryDate: "2025-12-01",
    deliveryMethod: "pickup",
    regularCookies: {},
    brownieCookieSets: [
        {
            quantity: 12,
            shape: "birthdayBear",
            customSticker: false,
            customTopper: false,
        }
    ],
    twoPackSets: [],
    singleWithDrinkSets: [],
    sconeSets: [],
    fortuneCookie: 0,
    airplaneSandwich: 0,
};

async function testBirthdayBearPricing() {
    try {
        const response = await fetch('http://localhost:5000/api/calculate-price', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });

        const result = await response.json();
        console.log('서버 응답:', JSON.stringify(result, null, 2));

        // Expected: 12 * 7800 (base) + 12 * 500 (birthdayBear) = 93,600 + 6,000 = 99,600
        console.log('\n예상 가격:');
        console.log('기본 브라우니 (12개 × 7,800원) = 93,600원');
        console.log('생일곰 추가 (12개 × 500원) = 6,000원');
        console.log('총 합계 = 99,600원');

        console.log('\n실제 가격:');
        console.log('브라우니 breakdown:', result.breakdown.brownie, '원');
        console.log('총 합계:', result.totalPrice, '원');

        if (result.totalPrice === 99600) {
            console.log('\n✅ 테스트 통과: 생일곰 가격이 올바르게 계산됨');
        } else {
            console.log('\n❌ 테스트 실패: 생일곰 가격이 올바르게 계산되지 않음');
        }
    } catch (error) {
        console.error('테스트 실패:', error);
    }
}

testBirthdayBearPricing();
