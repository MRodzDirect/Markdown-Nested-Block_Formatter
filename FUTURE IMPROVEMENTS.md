* Handle new cases where there are indented and nested blocks. Of course the examples below would be more complex as shall also contemplate nested ones. Here '*' char works the same as '-' or '+' (only for markdown  and derived-languages sublocks and blocks, for other languages this char rule shall not  exist)

  * i.e

  * ```shell
    echo this one
    ```

    ```python
    print("or this one")
    ```

    * ```r
      cat("or this one")
      ```

      ```shell
      echo("you see the trick")
      ```

      

    * ```shell
      echo another block
      ```

    * ```java
      // this is java
      ```

    * 

  * And there are numbered ones:

  1. ```shell
     echo numbered 1
     ```

     1. ```shell
        echo sub-numbered_1
        ```

        ```shell
        echo this one doesnt have number
        ```

        

     2. ```shell
        echo sub-numbered_2
        ```

     * ```shell
       echo this one didnt got a number
       ```

  2. ~~~r
     cat("as you can look, even tildes also can be indented")
     ~~~

  1. Also number fixing would be useful
     1. But that is for a future improvement

* ```shell
  echo end of new case #1
  ```

---

* Another case which goes beyond the scope of the project is: Automatic number indexing i.e

1. this is 1

   1. this shall be 1.1
   2. this shall be 1.2

2. this is 2

   * this doesnt have sub-number

   * 1. This one shall also be included in 2. So it is 2.1 

     2. this is 2.2

        1. this is 2.2.1

        2. * this one doesn't have any sub-numbering
           * nor this

           1. but this one is 2.2.2.1

3. and this is 3