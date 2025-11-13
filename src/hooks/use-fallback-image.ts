export function useFallbackImage(gender: string) {
    return gender === 'male' ? '/images/nophoto_male.jpg' : '/images/nophoto_female.jpg';
}
