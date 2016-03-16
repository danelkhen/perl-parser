

$a;
$a + $b;
$a + $b + $c;
$a + $b / $c * $d;

return $a;
return $a + $b;
return $a + $b + $c;
return $a + $b / $c * $d;


$a->{name} cmp $b->{name};
sort { $a->{name} cmp $b->{name} } @b;

@ary = (1, 3, sort 4, 2);
@ary = (1, 3, sort 4 + 2);


chdir $foo || die; # (chdir $foo) || die
chdir $foo * 20;   # chdir ($foo * 20)
